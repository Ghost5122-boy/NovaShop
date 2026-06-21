import { getAccount, createPayPalOrder, confirmPayment, getPublicSettings } from './api.js?v=12';
import { fetchPlayerTiers, getSkinUrl, startTierRefresh, tierValueClass, bestManualTier } from './tiers.js?v=12';

const params = new URLSearchParams(window.location.search);
const accountId = params.get('id');
const loading = document.getElementById('loading');
const detailEl = document.getElementById('account-detail');
const errorState = document.getElementById('error-state');

let paypalSdkPromise = null;
let loadedPayPalClientId = null;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTiersGrid(rankings) {
  if (!rankings?.length) {
    return '<p style="color:var(--text-muted)">Aucun tier actif trouvé sur PvPTiers.</p>';
  }
  return rankings.map(r => `
    <div class="tier-item">
      <div class="tier-item-mode">${esc(r.label)}</div>
      <div class="tier-item-value ${r.pos === 0 ? 'ht' : 'lt'}">${esc(r.tierStr)}</div>
      ${r.peakTier ? `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.2rem">Peak: ${esc(r.peakTier)}</div>` : ''}
    </div>
  `).join('');
}

function renderManualGrid(tiers) {
  if (!tiers?.length) {
    return '<p style="color:var(--text-muted)">Aucun tier.</p>';
  }
  return tiers.map(t => {
    const isHt = tierValueClass(t.value).startsWith('ht');
    return `
    <div class="tier-item">
      <div class="tier-item-mode">${esc(t.mode)}</div>
      <div class="tier-item-value ${isHt ? 'ht' : 'lt'}">${esc(t.value)}</div>
    </div>`;
  }).join('');
}

function hasManualTiers(account) {
  return Array.isArray(account.tiers) && account.tiers.length > 0;
}

function loadPayPalSdk(clientId) {
  if (window.paypal && loadedPayPalClientId === clientId) {
    return Promise.resolve(window.paypal);
  }
  document.querySelectorAll('script[src*="paypal.com/sdk/js"]').forEach(el => el.remove());
  try { delete window.paypal; } catch { window.paypal = undefined; }
  loadedPayPalClientId = clientId;
  paypalSdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=EUR&intent=capture`;
    s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error('SDK PayPal vide')));
    s.onerror = () => reject(new Error('SDK PayPal non chargé'));
    document.head.appendChild(s);
  });
  return paypalSdkPromise;
}

function renderPayPalFallback(box, account, settings) {
  box.innerHTML = `
    <div class="payment-discord">
      <div class="payment-discord-top">
        <span class="payment-paypal-icon">P</span>
        <div>
          <strong>Paiement PayPal</strong>
          <p>Montant : <span class="payment-amount">${account.price.toFixed(2)} €</span></p>
        </div>
      </div>
      <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem">
        Envoie <strong>${account.price.toFixed(2)} €</strong> à
        <strong>paypal.me/${esc(settings.paypalMe)}</strong>, puis contacte le vendeur
        avec le pseudo <strong>${esc(account.username)}</strong> pour recevoir les identifiants.
      </p>
      <a href="https://paypal.me/${encodeURIComponent(settings.paypalMe)}/${account.price.toFixed(2)}"
         target="_blank" rel="noopener noreferrer" class="btn btn-paypal">Ouvrir PayPal.me</a>
    </div>`;
}

async function setupPayment(account) {
  const box = document.getElementById('payment-box');
  if (!box) return;

  const price = Number(account.price) || 0;

  // Compte gratuit : livraison directe sans PayPal.
  if (price <= 0) {
    box.innerHTML = `
      <div class="payment-discord">
        <div class="payment-discord-top">
          <span class="payment-paypal-icon">🎁</span>
          <div>
            <strong>Compte gratuit</strong>
            <p>Montant : <span class="payment-amount">0,00 €</span></p>
          </div>
        </div>
        <button type="button" id="free-claim-btn" class="btn btn-primary" style="width:100%;margin-top:0.5rem">
          Obtenir le compte gratuitement
        </button>
        <p id="pay-status" class="pay-status"></p>
      </div>`;
    document.getElementById('free-claim-btn').addEventListener('click', async () => {
      const status = document.getElementById('pay-status');
      const btn = document.getElementById('free-claim-btn');
      btn.disabled = true;
      status.textContent = 'Préparation de la livraison…';
      try {
        const order = await createPayPalOrder(account.id);
        await confirmPayment(order.token, account.id, 'FREE');
        window.location.href = `delivery.html?accountId=${encodeURIComponent(account.id)}&token=${encodeURIComponent(order.token)}`;
      } catch (e) {
        status.textContent = (e && e.message) || 'Erreur. Réessaie.';
        btn.disabled = false;
      }
    });
    return;
  }

  box.innerHTML = `
    <div class="payment-discord">
      <div class="payment-discord-top">
        <span class="payment-paypal-icon">P</span>
        <div>
          <strong>Paiement sécurisé PayPal</strong>
          <p>Montant : <span class="payment-amount">${account.price.toFixed(2)} €</span></p>
        </div>
      </div>
      <div id="paypal-buttons"></div>
      <p id="pay-status" class="pay-status">Chargement du paiement…</p>
    </div>`;

  const status = document.getElementById('pay-status');
  const settings = await getPublicSettings();

  if (!settings.paypalClientId) {
    renderPayPalFallback(box, account, settings);
    return;
  }

  let paypal;
  try {
    paypal = await loadPayPalSdk(settings.paypalClientId);
  } catch {
    renderPayPalFallback(box, account, settings);
    return;
  }

  status.textContent = '';

  try {
    paypal.Buttons({
      style: { layout: 'vertical', color: 'blue', shape: 'pill', label: 'paypal', height: 48 },
      createOrder: (data, actions) => actions.order.create({
        intent: 'CAPTURE',
        purchase_units: [{
          description: `Compte Minecraft ${account.username}`.slice(0, 127),
          amount: { value: account.price.toFixed(2), currency_code: 'EUR' }
        }]
      }),
      onApprove: async (data, actions) => {
        status.textContent = 'Validation du paiement…';
        try {
          const capture = await actions.order.capture();
          if (capture?.status !== 'COMPLETED') throw new Error('Paiement non finalisé');
          const order = await createPayPalOrder(account.id);
          await confirmPayment(order.token, account.id, data.orderID);
          window.location.href = `delivery.html?accountId=${encodeURIComponent(account.id)}&token=${encodeURIComponent(order.token)}`;
        } catch (e) {
          status.textContent = (e && e.message) || 'Erreur après paiement. Contacte le vendeur.';
        }
      },
      onCancel: () => { status.textContent = 'Paiement annulé.'; },
      onError: (err) => {
        console.error('PayPal error', err);
        status.textContent = 'Erreur PayPal. Réessaie ou utilise PayPal.me.';
      }
    }).render('#paypal-buttons').catch(() => renderPayPalFallback(box, account, settings));
  } catch {
    renderPayPalFallback(box, account, settings);
  }
}

function renderAccount(account, tierData) {
  const manual = hasManualTiers(account);
  const mainTier = manual ? bestManualTier(account.tiers) : tierData?.bestTier;
  const tiersTitle = manual
    ? 'Tiers'
    : 'Tiers PvPTiers <span id="tier-status" style="font-weight:400;font-size:0.8rem">(actualisation auto 30s)</span>';
  const tiersHtml = manual ? renderManualGrid(account.tiers) : renderTiersGrid(tierData?.rankings);

  detailEl.innerHTML = `
    <div class="account-detail-header">
      <div class="account-detail-skin">
        <img src="${getSkinUrl(account.username)}" alt="${esc(account.username)}">
      </div>
      ${account.certified ? '<span class="certified-badge">Compte certifié</span>' : ''}
      <h1 class="account-detail-name">${esc(account.username)}</h1>
      ${mainTier ? `<div class="account-tier-main">${esc(mainTier)}</div>` : ''}
    </div>
    <div class="account-detail-body">
      ${account.description ? `<p style="color:var(--text-muted);margin-bottom:1.5rem">${esc(account.description)}</p>` : ''}
      <div class="tiers-section">
        <h3>${tiersTitle}</h3>
        <div class="tiers-grid" id="tiers-grid">${tiersHtml}</div>
        ${manual ? '' : '<p class="tier-refresh" id="last-refresh">Dernière mise à jour : à l\'instant</p>'}
      </div>
      <div class="account-detail-price">
        <div class="label">Prix</div>
        <div class="price">${account.price.toFixed(2)} €</div>
      </div>
      <div class="buy-section">
        <div id="payment-box"></div>
      </div>
    </div>
  `;

  setupPayment(account);

  if (manual) return;

  startTierRefresh(account.username, (data) => {
    const grid = document.getElementById('tiers-grid');
    if (grid) grid.innerHTML = renderTiersGrid(data.rankings);
    const refreshEl = document.getElementById('last-refresh');
    if (refreshEl) refreshEl.textContent = `Dernière mise à jour : ${new Date().toLocaleTimeString('fr-FR')}`;
    const nameEl = document.querySelector('.account-tier-main');
    if (nameEl && data.bestTier) nameEl.textContent = data.bestTier;
  });
}

async function init() {
  if (!accountId) {
    loading.classList.add('hidden');
    errorState.classList.remove('hidden');
    return;
  }

  try {
    const account = await getAccount(accountId);
    loading.classList.add('hidden');
    detailEl.classList.remove('hidden');

    // Tiers manuels → pas d'appel API (rapide). Sinon on récupère en arrière-plan.
    if (hasManualTiers(account)) {
      renderAccount(account, { rankings: [], bestTier: null });
    } else {
      let tierData = { rankings: [], bestTier: null };
      try { tierData = await fetchPlayerTiers(account.username); } catch { /* optionnel */ }
      renderAccount(account, tierData);
    }
  } catch {
    loading.classList.add('hidden');
    errorState.classList.remove('hidden');
  }
}

init();

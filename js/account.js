import { getAccount, createPayPalOrder, confirmPayment, getPublicSettings } from './api.js';
import { PAYPAL_ME } from './config.js';
import { fetchPlayerTiers, getSkinUrl, startTierRefresh } from './tiers.js';

const params = new URLSearchParams(window.location.search);
const accountId = params.get('id');
const loading = document.getElementById('loading');
const detailEl = document.getElementById('account-detail');
const errorState = document.getElementById('error-state');

let paypalSdkPromise = null;

function renderTiersGrid(rankings) {
  if (!rankings?.length) {
    return '<p style="color:var(--text-muted)">Aucun tier actif trouvé sur PvPTiers.</p>';
  }
  return rankings.map(r => `
    <div class="tier-item">
      <div class="tier-item-mode">${r.label}</div>
      <div class="tier-item-value ${r.pos === 0 ? 'ht' : 'lt'}">${r.tierStr}</div>
      ${r.peakTier ? `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.2rem">Peak: ${r.peakTier}</div>` : ''}
    </div>
  `).join('');
}

function loadPayPalSdk(clientId) {
  if (paypalSdkPromise) return paypalSdkPromise;
  paypalSdkPromise = new Promise((resolve, reject) => {
    if (window.paypal) { resolve(window.paypal); return; }
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=EUR&intent=capture`;
    s.onload = () => resolve(window.paypal);
    s.onerror = () => reject(new Error('SDK PayPal'));
    document.head.appendChild(s);
  });
  return paypalSdkPromise;
}

async function setupPayment(account) {
  const box = document.getElementById('payment-box');
  if (!box) return;
  const settings = await getPublicSettings();

  // Pas de Client ID configuré → secours simple (lien PayPal.me), sans faux bouton.
  if (!settings.paypalClientId) {
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
          Envoie le montant exact à <strong>paypal.me/${settings.paypalMe}</strong>, puis contacte le vendeur
          avec le pseudo <strong>${account.username}</strong> pour recevoir les identifiants.
        </p>
        <a href="https://paypal.me/${settings.paypalMe}/${account.price.toFixed(2)}"
           target="_blank" rel="noopener noreferrer" class="btn btn-paypal">
          Ouvrir PayPal.me
        </a>
        <p style="font-size:0.78rem;color:var(--text-muted);margin-top:0.75rem;text-align:center">
          Astuce admin : ajoute ton « Client ID PayPal » dans les Réglages pour le paiement automatique sur le site.
        </p>
      </div>`;
    return;
  }

  // Paiement intégré : boutons PayPal (popup sur le site, façon Discord).
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
      <p id="pay-status" class="pay-status"></p>
    </div>`;

  const status = document.getElementById('pay-status');
  try {
    const paypal = await loadPayPalSdk(settings.paypalClientId);
    paypal.Buttons({
      style: { layout: 'vertical', color: 'blue', shape: 'pill', label: 'paypal', height: 48 },
      createOrder: (data, actions) => actions.order.create({
        purchase_units: [{
          description: `Compte Minecraft ${account.username}`,
          amount: { value: account.price.toFixed(2), currency_code: 'EUR' }
        }]
      }),
      onApprove: async (data, actions) => {
        status.textContent = 'Validation du paiement...';
        await actions.order.capture();
        const order = await createPayPalOrder(account.id);
        await confirmPayment(order.token);
        window.location.href = `delivery.html?accountId=${account.id}&token=${order.token}`;
      },
      onCancel: () => { status.textContent = 'Paiement annulé.'; },
      onError: () => { status.textContent = 'Erreur PayPal. Réessaie ou contacte le vendeur.'; }
    }).render('#paypal-buttons');
  } catch {
    status.textContent = 'Impossible de charger PayPal. Vérifie le Client ID dans les Réglages.';
  }
}

function renderAccount(account, tierData) {
  detailEl.innerHTML = `
    <div class="account-detail-header">
      <div class="account-detail-skin">
        <img src="${getSkinUrl(account.username)}" alt="${account.username}">
      </div>
      ${account.certified ? '<span class="certified-badge">Compte certifié</span>' : ''}
      <h1 class="account-detail-name">${account.username}</h1>
      ${tierData?.bestTier ? `<div class="account-tier-main">${tierData.bestTier}</div>` : ''}
    </div>
    <div class="account-detail-body">
      ${account.description ? `<p style="color:var(--text-muted);margin-bottom:1.5rem">${account.description}</p>` : ''}
      <div class="tiers-section">
        <h3>Tiers PvPTiers <span id="tier-status" style="font-weight:400;font-size:0.8rem">(actualisation auto 30s)</span></h3>
        <div class="tiers-grid" id="tiers-grid">${renderTiersGrid(tierData?.rankings)}</div>
        <p class="tier-refresh" id="last-refresh">Dernière mise à jour : à l'instant</p>
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

  startTierRefresh(account.username, (data) => {
    document.getElementById('tiers-grid').innerHTML = renderTiersGrid(data.rankings);
    document.getElementById('last-refresh').textContent =
      `Dernière mise à jour : ${new Date().toLocaleTimeString('fr-FR')}`;
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
    const tierData = await fetchPlayerTiers(account.username);
    loading.classList.add('hidden');
    detailEl.classList.remove('hidden');
    renderAccount(account, tierData);
  } catch {
    loading.classList.add('hidden');
    errorState.classList.remove('hidden');
  }
}

init();

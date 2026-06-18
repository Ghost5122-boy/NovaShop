import { getAccount, createPayPalOrder, confirmPayment } from './api.js';
import { getPayPalUrl, PAYPAL_ME } from './config.js';
import { fetchPlayerTiers, getSkinUrl, getTierClass, startTierRefresh } from './tiers.js';

const params = new URLSearchParams(window.location.search);
const accountId = params.get('id');
const loading = document.getElementById('loading');
const detailEl = document.getElementById('account-detail');
const errorState = document.getElementById('error-state');

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

function renderPaymentBox(account) {
  const paypalUrl = getPayPalUrl(account.price);
  const price = account.price.toFixed(2);
  return `
    <div class="payment-discord">
      <div class="payment-discord-top">
        <span class="payment-paypal-icon">P</span>
        <div>
          <strong>Paiement PayPal</strong>
          <p>Montant exact : <span class="payment-amount">${price} €</span></p>
        </div>
      </div>
      <ol class="payment-steps">
        <li>Clique sur le bouton PayPal ci-dessous</li>
        <li>Envoie <strong>${price} €</strong> sur <strong>paypal.me/${PAYPAL_ME}</strong></li>
        <li>Reviens ici et clique sur « J'ai payé »</li>
      </ol>
      <a href="${paypalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-paypal" id="paypal-pay-btn">
        Payer ${price} € sur PayPal
      </a>
      <div class="payment-link-row">
        <input type="text" class="payment-link-input" id="paypal-link-text" value="${paypalUrl}" readonly>
        <button type="button" class="btn btn-outline btn-sm" id="copy-paypal-link">Copier le lien</button>
      </div>
      <button type="button" class="btn btn-primary payment-confirm-btn" id="confirm-paid-btn">
        J'ai effectué le paiement
      </button>
    </div>
  `;
}

function bindPaymentHandlers(account) {
  const paypalUrl = getPayPalUrl(account.price);

  document.getElementById('copy-paypal-link')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(paypalUrl);
      const btn = document.getElementById('copy-paypal-link');
      btn.textContent = 'Copié !';
      setTimeout(() => { btn.textContent = 'Copier le lien'; }, 2000);
    } catch {
      document.getElementById('paypal-link-text')?.select();
    }
  });

  document.getElementById('confirm-paid-btn')?.addEventListener('click', () => handleConfirmPaid(account));
}

async function handleConfirmPaid(account) {
  const btn = document.getElementById('confirm-paid-btn');
  btn.disabled = true;
  btn.textContent = 'Vérification...';

  let token = sessionStorage.getItem(`nova_order_${account.id}`);
  if (!token) {
    try {
      const order = await createPayPalOrder(account.id);
      token = order.token;
      sessionStorage.setItem(`nova_order_${account.id}`, token);
    } catch {
      token = crypto.randomUUID?.() || String(Date.now());
      sessionStorage.setItem(`nova_order_${account.id}`, token);
    }
  }

  try {
    await confirmPayment(token);
    window.location.href = `delivery.html?accountId=${account.id}&token=${token}`;
  } catch {
    alert(`Paiement enregistré ! Si les identifiants ne s'affichent pas, contacte le vendeur avec le pseudo « ${account.username} » et une capture PayPal.`);
    btn.disabled = false;
    btn.textContent = "J'ai effectué le paiement";
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
        ${renderPaymentBox(account)}
      </div>
    </div>
  `;

  bindPaymentHandlers(account);

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

import { getAccount, createPayPalOrder, confirmPayment } from './api.js';
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
        <button class="btn btn-buy" id="buy-btn">ACHETER MAINTENANT</button>
        <div id="paypal-container" style="margin-top:1rem"></div>
      </div>
    </div>
  `;

  document.getElementById('buy-btn').addEventListener('click', handleBuy);

  startTierRefresh(account.username, (data) => {
    document.getElementById('tiers-grid').innerHTML = renderTiersGrid(data.rankings);
    document.getElementById('last-refresh').textContent =
      `Dernière mise à jour : ${new Date().toLocaleTimeString('fr-FR')}`;
    const nameEl = document.querySelector('.account-tier-main');
    if (nameEl && data.bestTier) nameEl.textContent = data.bestTier;
  });
}

async function handleBuy() {
  const btn = document.getElementById('buy-btn');
  btn.disabled = true;
  btn.textContent = 'Redirection PayPal...';

  try {
    const order = await createPayPalOrder(accountId);
    if (order.approvalUrl) {
      window.location.href = order.approvalUrl;
    } else if (order.paypalLink) {
      window.open(order.paypalLink, '_blank');
      setTimeout(async () => {
        const confirmed = confirm('Avez-vous effectué le paiement PayPal ?');
        if (confirmed) {
          try {
            await confirmPayment(order.token);
            window.location.href = `delivery.html?accountId=${accountId}&token=${order.token}`;
          } catch (err) {
            alert('Erreur: ' + err.message);
            btn.disabled = false;
            btn.textContent = 'ACHETER MAINTENANT';
          }
        } else {
          btn.disabled = false;
          btn.textContent = 'ACHETER MAINTENANT';
        }
      }, 2000);
    }
  } catch (err) {
    alert('Erreur paiement: ' + err.message);
    btn.disabled = false;
    btn.textContent = 'ACHETER MAINTENANT';
  }
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

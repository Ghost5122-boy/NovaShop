import { getAccounts } from './api.js';
import { fetchPlayerTiers, getSkinUrl, getTierClass, startTierRefresh } from './tiers.js';

const carousel = document.getElementById('carousel');
const loading = document.getElementById('loading');
const shopContent = document.getElementById('shop-content');
const emptyState = document.getElementById('empty-state');
const refreshIntervals = [];

function renderTiersBadges(rankings, limit = 4) {
  if (!rankings?.length) return '<span class="tier-badge">Aucun tier</span>';
  return rankings.slice(0, limit).map(r =>
    `<span class="tier-badge ${getTierClass(r.tier, r.pos)}">${r.label} ${r.tierStr}</span>`
  ).join('');
}

function createCard(account, tierData) {
  const card = document.createElement('div');
  card.className = 'account-card';
  card.dataset.id = account.id;
  card.innerHTML = `
    <div class="account-card-skin">
      ${account.certified ? '<span class="certified-badge">Certifié</span>' : ''}
      <img src="${getSkinUrl(account.username)}" alt="${account.username}" loading="lazy">
    </div>
    <div class="account-card-body">
      <div class="account-username">${account.username}</div>
      <div class="account-tier-main" data-tier-main>${tierData?.bestTier || '...'}</div>
      <div class="account-tiers-list" data-tiers-list>${renderTiersBadges(tierData?.rankings)}</div>
      <div class="account-price">${account.price.toFixed(2)} €</div>
    </div>
  `;

  card.addEventListener('click', () => {
    window.location.href = `account.html?id=${account.id}`;
  });

  return card;
}

async function loadTiersForCard(card, username) {
  const tierData = await fetchPlayerTiers(username);
  const mainEl = card.querySelector('[data-tier-main]');
  const listEl = card.querySelector('[data-tiers-list]');
  if (mainEl) mainEl.textContent = tierData.bestTier || 'Non classé';
  if (listEl) listEl.innerHTML = renderTiersBadges(tierData.rankings);

  const interval = startTierRefresh(username, (data) => {
    if (mainEl) mainEl.textContent = data.bestTier || 'Non classé';
    if (listEl) listEl.innerHTML = renderTiersBadges(data.rankings);
  });
  refreshIntervals.push(interval);
}

async function init() {
  try {
    const accounts = await getAccounts();
    loading.classList.add('hidden');

    if (!accounts.length) {
      emptyState.classList.remove('hidden');
      return;
    }

    shopContent.classList.remove('hidden');

    for (const account of accounts) {
      const card = createCard(account, null);
      carousel.appendChild(card);
      loadTiersForCard(card, account.username);
    }
  } catch (err) {
    loading.innerHTML = `<p style="color:#ff4757">Erreur: ${err.message}</p>`;
  }
}

document.getElementById('scroll-left')?.addEventListener('click', () => {
  carousel.scrollBy({ left: -320, behavior: 'smooth' });
});

document.getElementById('scroll-right')?.addEventListener('click', () => {
  carousel.scrollBy({ left: 320, behavior: 'smooth' });
});

init();

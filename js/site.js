import { getAdminUrl, SHOP_URL } from './config.js?v=4';

export function initSiteLinks() {
  const url = getAdminUrl();
  document.querySelectorAll('[data-admin-link]').forEach(el => {
    el.href = url;
  });

  const shopLink = document.getElementById('shop-home-link');
  if (shopLink && !location.hostname.endsWith('github.io')) {
    shopLink.href = SHOP_URL;
  }
}

initSiteLinks();

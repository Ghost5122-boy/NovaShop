import { getAdminUrl, SHOP_URL, SITE_NAME } from './config.js?v=11';

function logoInitials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function initSiteBranding() {
  const initials = logoInitials(SITE_NAME);
  document.querySelectorAll('.logo').forEach(logo => {
    const icon = logo.querySelector('.logo-icon');
    if (icon) icon.textContent = initials;
    const textNodes = [...logo.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (textNodes.length) {
      textNodes.forEach(n => { n.textContent = ` ${SITE_NAME}`; });
    } else if (!logo.querySelector('.logo-text')) {
      logo.append(document.createTextNode(` ${SITE_NAME}`));
    }
  });
}

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
initSiteBranding();

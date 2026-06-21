import { getAdminUrl, SHOP_URL, SITE_NAME } from './config.js?v=13';
import { getPublicSettings } from './api.js?v=13';
import { applySiteBranding } from './branding.js?v=13';

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

async function initSiteBranding() {
  applySiteBranding(SITE_NAME);
  try {
    const settings = await getPublicSettings();
    applySiteBranding(settings.siteName);
  } catch { /* garde le nom par défaut */ }
}

initSiteLinks();
initSiteBranding();

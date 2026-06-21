/** Boutique publique (GitHub Pages) */
export const SHOP_URL = 'https://ghost5122-boy.github.io/NovaShop/';

/** Admin (même site) */
export const ADMIN_URL = 'https://ghost5122-boy.github.io/NovaShop/admin/';

/** Repo GitHub — publication du catalogue pour tous les visiteurs */
export const GITHUB_OWNER = 'Ghost5122-boy';
export const GITHUB_REPO = 'NovaShop';
export const GITHUB_BRANCH = 'main';

/**
 * Backend optionnel. Laisse VIDE : le site fonctionne 100% en autonome
 * (catalogue statique + localStorage). Aucune attente serveur = site rapide.
 */
export const BACKEND_URL = '';

/** Lien PayPal.me (secours si le SDK PayPal ne charge pas) */
export const PAYPAL_ME = 'NexusMarket1733';

/** Client ID PayPal Live — paiement intégré sur le site (popup). */
export const PAYPAL_CLIENT_ID =
  'AZiTIxB8vNgL9pxrwrs9FaeURfrhE5FJGKCscmu2ZniZDGaC6-NjsrlDTl2ySu0TTxxYU37OZqJqZdQW';

export function getAdminUrl() {
  return 'admin/';
}

export function getPayPalUrl(amount) {
  return `https://paypal.me/${PAYPAL_ME}/${Number(amount).toFixed(2)}`;
}

/** Racine du site (sous-dossier GitHub Pages ou /). */
export function getSiteRoot() {
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length && parts[0] !== 'index.html' && !parts[0].includes('.')) {
    return `/${parts[0]}/`;
  }
  return '/';
}

export function dataUrl(file) {
  return `${location.origin}${getSiteRoot()}data/${file}`;
}

/** Boutique publique (GitHub Pages) */
export const SHOP_URL = 'https://ghost5122-boy.github.io/NovaShop/';

/** API Render (livraison des identifiants après paiement). Laisse vide si indisponible. */
export const BACKEND_URL = 'https://nova-shop.onrender.com';

/** Lien PayPal.me (secours si le SDK ne charge pas) */
export const PAYPAL_ME = 'NovaShop1733';

/** Client ID PayPal Live — paiement intégré sur le site (popup). */
export const PAYPAL_CLIENT_ID =
  'EBXwuM3xaBRRCirleypUqpMjYvF9jB-lo0QxgJS91NDjUbSjuoeT7UwngcbdKZvNgOEZM64N1BhtkQ';

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

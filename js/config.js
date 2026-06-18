/** Boutique publique (GitHub Pages) */
export const SHOP_URL = 'https://ghost5122-boy.github.io/NovaShop/';

/** Serveur API (Render — site principal) */
export const BACKEND_URL = 'https://nova-shop.onrender.com';

/** Lien PayPal.me — style Discord */
export const PAYPAL_ME = 'NovaShop1733';

export function getAdminUrl() {
  return `${BACKEND_URL.replace(/\/$/, '')}/admin/`;
}

export function getPayPalUrl(amount) {
  const price = Number(amount).toFixed(2);
  return `https://paypal.me/${PAYPAL_ME}/${price}`;
}

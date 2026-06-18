/** Boutique publique (GitHub Pages) */
export const SHOP_URL = 'https://ghost5122-boy.github.io/NovaShop/';

/** Lien PayPal.me — style Discord */
export const PAYPAL_ME = 'NovaShop1733';

/** Admin (chemin relatif depuis la racine du site) */
export function getAdminUrl() {
  return 'admin/';
}

export function getPayPalUrl(amount) {
  const price = Number(amount).toFixed(2);
  return `https://paypal.me/${PAYPAL_ME}/${price}`;
}

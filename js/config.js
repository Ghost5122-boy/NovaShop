/** Boutique publique (GitHub Pages) */
export const SHOP_URL = 'https://ghost5122-boy.github.io/NovaShop/';

/** Serveur admin + API (Render) — change si ton URL Render est différente */
export const BACKEND_URL = 'https://nova-shop-admin.onrender.com';

export function getAdminUrl() {
  return `${BACKEND_URL.replace(/\/$/, '')}/admin/`;
}

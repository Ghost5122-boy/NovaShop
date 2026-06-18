/** Boutique publique (GitHub Pages) */
export const SHOP_URL = 'https://ghost5122-boy.github.io/NovaShop/';

/** Lien PayPal.me (affiché en secours si pas de Client ID) */
export const PAYPAL_ME = 'NovaShop1733';

/**
 * Client ID PayPal pour le paiement intégré (popup sur le site, façon Discord).
 * Laisse vide ici : il se règle dans l'admin → onglet Réglages.
 * Pour l'obtenir : https://developer.paypal.com → Apps & Credentials → Live → Create App → copier le Client ID.
 */
export const PAYPAL_CLIENT_ID = '';

/** Admin (chemin relatif depuis la racine du site) */
export function getAdminUrl() {
  return 'admin/';
}

export function getPayPalUrl(amount) {
  const price = Number(amount).toFixed(2);
  return `https://paypal.me/${PAYPAL_ME}/${price}`;
}

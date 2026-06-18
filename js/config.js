/** Boutique publique (GitHub Pages) */
export const SHOP_URL = 'https://ghost5122-boy.github.io/NovaShop/';

/**
 * Backend optionnel. Laisse VIDE : le site fonctionne 100% en autonome
 * (catalogue statique + localStorage). Aucune attente serveur = site rapide.
 */
export const BACKEND_URL = '';

/** Lien PayPal.me (secours si le SDK PayPal ne charge pas) */
export const PAYPAL_ME = 'NovaShop1733';

/**
 * Client ID PayPal Live — paiement intégré sur le site (popup).
 * IMPORTANT : c'est le « Client ID » (commence par "A..."), PAS le « Secret ».
 * À récupérer sur developer.paypal.com → Apps & Credentials → Live → ton app → Client ID.
 * Tant qu'il est vide ou invalide, le site bascule sur le paiement PayPal.me.
 */
export const PAYPAL_CLIENT_ID = '';

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

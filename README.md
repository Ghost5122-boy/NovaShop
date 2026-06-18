# Nova Shop

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Ghost5122-boy/NovaShop)

Boutique de comptes Minecraft — site + admin.

## Fonctionnalités

- **Page d'accueil** — Présentation du service
- **Boutique** — Carrousel défilable avec skins Minecraft et tiers PvPTiers (refresh 30s)
- **Page compte** — Détails, tous les tiers, badge certifié, bouton achat PayPal
- **Livraison** — Email + mot de passe après paiement confirmé
- **Admin** (`/admin/`) — Gestion complète des comptes et config PayPal

## APIs utilisées

- **Skins** : [MC Heads](https://mc-heads.net/) — `mc-heads.net/body/{pseudo}`
- **Tiers** : [PvPTiers](https://pvptiers.com/) — même API que le mod Tiers officiel
  - Endpoint : `https://pvptiers.com/api/search_profile/{pseudo}`
  - Format : HT1, LT3, etc. (tier + pos: 0=HT, 1=LT)

## Démarrage local

```bash
cd nova-minecraft-shop
npm install
npm start
```

Ouvrez http://localhost:3000

**Admin** : http://localhost:3000/admin/  
**Mot de passe** : `NovaShop1986*`

## Configuration PayPal

1. Connectez-vous à l'admin
2. Onglet "Paramètres PayPal"
3. Entrez votre email PayPal (pour les liens paypal.me)
4. Optionnel : Client ID PayPal pour boutons intégrés

## Hébergement GitHub Pages

GitHub Pages sert uniquement les fichiers statiques. Pour le paiement, l'admin et la livraison des identifiants, déployez le serveur Node.js sur [Render](https://render.com), [Railway](https://railway.app) ou similaire.

### GitHub Pages (frontend seul)

1. Créez un repo GitHub
2. Poussez ce projet
3. Settings → Pages → Source: `main` branch, `/ (root)`
4. Le shop affichera les comptes depuis `data/store.json` (sans paiement sécurisé)

### Déploiement complet (recommandé)

1. Déployez `server.js` sur Render (Web Service, build: `npm install`, start: `npm start`)
2. Le serveur sert le frontend + API

## Structure

```
nova-minecraft-shop/
├── index.html          # Accueil
├── shop.html           # Boutique
├── account.html        # Détail compte
├── delivery.html       # Livraison identifiants
├── admin/index.html    # Panneau admin
├── css/style.css
├── js/                 # Logique frontend
├── data/store.json     # Données (comptes, commandes, settings)
└── server.js           # API backend
```

## Sécurité

- Ne commitez pas de vrais mots de passe en production
- Changez le mot de passe admin dans `data/store.json`
- Utilisez HTTPS en production
- Les identifiants ne sont délivrés qu'après confirmation de paiement

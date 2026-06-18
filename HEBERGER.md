# Heberger Nova Shop sur Internet (gratuit, pas sur ton PC)

## Option recommandee : Render.com (gratuit)

### Methode rapide (5 min)

1. **Double-clic sur `DEPLOYER-CLOUD.bat`**
2. Entre ton pseudo GitHub quand demande
3. Si tu n'as pas de compte GitHub : cree-en un sur [github.com](https://github.com)
4. Cree le repo vide : [github.com/new](https://github.com/new) → nom `nova-minecraft-shop`
5. Le script envoie le code, puis ouvre Render
6. Sur Render : **New Blueprint Instance** → choisis ton repo → **Apply**
7. Attends 2-3 minutes → tu recois une URL publique

### Tes URLs apres deploiement

| Page | URL |
|------|-----|
| Boutique | `https://nova-shop-xxxx.onrender.com` |
| Admin | `https://nova-shop-xxxx.onrender.com/admin/` |
| Mot de passe | `NovaShop1986*` |

---

## Important

- **Gratuit** : le site "s'endort" apres 15 min sans visiteurs (premiere visite = 30 sec de chargement)
- **Donnees** : les comptes ajoutes via l'admin sont gardes tant que le serveur tourne. Pour une sauvegarde permanente, redeploie rarement ou contacte-moi pour ajouter une base MongoDB gratuite.
- **PayPal** : configure ton email dans Admin → Parametres PayPal une fois en ligne

---

## Alternative : Railway.app

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Choisis `nova-minecraft-shop`
3. Railway detecte Node.js automatiquement

---

## Tu n'as plus besoin de DEMARRER.bat

Une fois sur Render, ton PC peut etre eteint — le site tourne dans le cloud.

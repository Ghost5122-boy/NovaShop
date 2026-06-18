# Mettre Nova Shop en ligne (Render — gratuit)

## Étapes (5 minutes)

1. Crée un compte sur **https://render.com** (gratuit, avec GitHub ou email)

2. Crée un repo GitHub :
   - Va sur **https://github.com/new**
   - Nom : `nova-minecraft-shop`
   - Crée le repo (vide)

3. Envoie le code depuis ton PC (dans le dossier du projet) :
   ```powershell
   cd C:\Users\cugur\Projects\nova-minecraft-shop
   git remote add origin https://github.com/TON-PSEUDO/nova-minecraft-shop.git
   git branch -M main
   git push -u origin main
   ```

4. Sur Render :
   - **New +** → **Blueprint**
   - Connecte ton repo GitHub `nova-minecraft-shop`
   - Render lit automatiquement `render.yaml`
   - Clique **Apply**

5. Attends 2-3 minutes. Tu obtiens une URL du type :
   `https://nova-shop-xxxx.onrender.com`

6. Admin : `https://ton-url.onrender.com/admin/`  
   Mot de passe : `NovaShop1986*`

## URL temporaire (tunnel local)

Si le serveur tourne chez toi (`DEMARRER.bat`), un tunnel public peut être actif.
Cette URL change à chaque redémarrage et ne marche que tant que ton PC est allumé.

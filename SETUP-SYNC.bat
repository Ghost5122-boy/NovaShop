@echo off
title Nexus Market - Setup sync automatique
echo.
echo  ============================================
echo   SETUP SYNC AUTOMATIQUE - Nexus Market
echo  ============================================
echo.
echo  Etape 1 : Deployer l'API sur Vercel (gratuit)
echo  --------------------------------------------
start https://vercel.com/new/clone?repository-url=https://github.com/Ghost5122-boy/NovaShop
echo.
echo  Etape 2 : Creer un token GitHub
echo  --------------------------------
start https://github.com/settings/tokens/new?scopes=repo&description=NexusMarket+Sync
echo.
echo  Etape 3 : Sur Vercel, ajouter la variable :
echo            GITHUB_PAT = ton token ghp_...
echo            ADMIN_PASSWORD = NovaShop1733
echo.
echo  Etape 4 : (optionnel) Sur GitHub repo Settings ^> Secrets ^> Actions
echo            Ajouter PUBLISH_TOKEN = meme token
echo.
pause

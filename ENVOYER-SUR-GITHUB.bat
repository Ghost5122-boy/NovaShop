@echo off
chcp 65001 >nul
title Envoyer Nova Shop sur GitHub
cd /d "%~dp0"
color 0B
cls
echo.
echo  ====================================================
echo     ENVOYER LE SITE SUR GITHUB - Ghost5122-boy
echo  ====================================================
echo.
echo  Ton repo GitHub est VIDE - c'est pour ca que tu vois
echo  la page "Quick setup". Il faut envoyer le code d'abord.
echo.
echo  ====================================================
echo  ETAPE 1 - Connexion GitHub (une seule fois)
echo  ====================================================
echo.
echo  Une fenetre va s'ouvrir dans ton navigateur.
echo  Connecte-toi avec Ghost5122-boy et autorise l'acces.
echo.
pause
"C:\Program Files\Git\mingw64\bin\git-credential-manager.exe" github login 2>nul
if errorlevel 1 (
  echo  Si la connexion auto echoue, on continue quand meme...
)
echo.
echo  ====================================================
echo  ETAPE 2 - Envoi du code
echo  ====================================================
echo.
git remote remove origin 2>nul
git remote add origin https://github.com/Ghost5122-boy/NovaShop.git
git branch -M main
git push -u origin main --force
if errorlevel 1 (
  color 0C
  echo.
  echo  ECHEC - Essaie la methode manuelle:
  echo.
  echo  1. Va sur https://github.com/settings/tokens
  echo  2. Generate new token - coche "repo"
  echo  3. Copie le token
  echo  4. Relance ce fichier
  echo  5. Username: Ghost5122-boy
  echo  6. Password: COLLE LE TOKEN (pas ton mot de passe)
  echo.
  pause
  exit /b 1
)
color 0A
echo.
echo  ====================================================
echo     SUCCES ! Code envoye sur GitHub !
echo  ====================================================
echo.
echo  Rafraichis cette page:
echo  https://github.com/Ghost5122-boy/NovaShop
echo.
echo  Tu dois voir les fichiers (index.html, server.js, etc.)
echo.
echo  ====================================================
echo  ETAPE 3 - Heberger en ligne (Render)
echo  ====================================================
echo.
echo  1. Va sur https://dashboard.render.com/blueprints
echo  2. Connecte-toi avec GitHub
echo  3. New Blueprint Instance
echo  4. Choisis NovaShop
echo  5. Clique Apply
echo.
start https://github.com/Ghost5122-boy/NovaShop
start https://dashboard.render.com/blueprints
echo.
pause

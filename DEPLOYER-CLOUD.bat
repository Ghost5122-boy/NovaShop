@echo off
title Deploy Nova Shop sur Render
cd /d "%~dp0"
echo.
echo  ============================================
echo    DEPLOIEMENT CLOUD - Nova Shop (Render)
echo  ============================================
echo.
echo  Etape 1: Cree un repo GitHub
echo  - Va sur https://github.com/new
echo  - Nom: nova-minecraft-shop
echo  - Public, sans README
echo  - Clique Create repository
echo.
set /p GITHUB_USER="Etape 2: Entre ton pseudo GitHub: "
if "%GITHUB_USER%"=="" (
  echo Pseudo manquant.
  pause
  exit /b 1
)
echo.
echo  Envoi du code sur GitHub...
git branch -M main 2>nul
git remote remove origin 2>nul
git remote add origin https://github.com/%GITHUB_USER%/nova-minecraft-shop.git
git push -u origin main
if errorlevel 1 (
  echo.
  echo  ERREUR push GitHub. Verifie que le repo existe et connecte-toi.
  echo  Tu peux aussi te connecter via: git login
  pause
  exit /b 1
)
echo.
echo  ============================================
echo    Code envoye ! Maintenant sur Render:
echo  ============================================
echo.
echo  1. Va sur https://dashboard.render.com/blueprints
echo  2. Clique "New Blueprint Instance"
echo  3. Connecte ton repo GitHub "nova-minecraft-shop"
echo  4. Clique "Apply" - attend 3 minutes
echo.
echo  Tu auras une URL du type:
echo  https://nova-shop-xxxx.onrender.com
echo.
echo  Admin: /admin/  |  MDP: NovaShop1986*
echo.
start https://dashboard.render.com/blueprints
pause

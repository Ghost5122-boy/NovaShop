@echo off
title Push Nova Shop vers GitHub
cd /d "%~dp0"
echo.
echo  Envoi vers GitHub: Ghost5122-boy/NovaShop
echo.
git remote remove origin 2>nul
git remote add origin https://github.com/Ghost5122-boy/NovaShop.git
git branch -M main
echo.
echo  Une fenetre GitHub va s'ouvrir pour te connecter.
echo  Clique "Sign in with your browser" si demande.
echo.
git push -u origin main
if errorlevel 1 (
  echo.
  echo  Si ca echoue, cree d'abord le repo sur GitHub:
  echo  https://github.com/new  -  nom: NovaShop
  pause
  exit /b 1
)
echo.
echo  ============================================
echo    Code envoye sur GitHub !
echo  ============================================
echo.
echo  Maintenant va sur Render pour heberger:
echo  https://dashboard.render.com/blueprints
echo.
echo  1. New Blueprint Instance
echo  2. Connecte GitHub et choisis NovaShop
echo  3. Clique Apply
echo.
start https://dashboard.render.com/blueprints
pause

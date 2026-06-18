@echo off
title Deployer Nova Shop sur Render
echo.
echo  Ouverture de Render dans ton navigateur...
echo.
echo  1. Connecte-toi avec GitHub (Ghost5122-boy)
echo  2. Clique "Apply" ou "Deploy"
echo  3. Attends 2-3 minutes
echo.
start https://render.com/deploy?repo=https://github.com/Ghost5122-boy/NovaShop
timeout /t 3 >nul
start https://dashboard.render.com/blueprints
echo.
echo  Apres le deploiement tu auras une URL du type:
echo  https://nova-shop-xxxx.onrender.com
echo.
echo  Admin: /admin/  |  MDP: NovaShop1986*
pause

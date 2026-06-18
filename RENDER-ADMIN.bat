@echo off
title Nova Shop - Deploy Admin Render
start https://render.com/deploy?repo=https://github.com/Ghost5122-boy/NovaShop
echo.
echo 1. Sur Render, choisis le blueprint "render-admin.yaml" si propose
echo 2. Sinon deploie le repo puis cree un service avec:
echo    Start command: node admin-server/start.js
echo 3. URL admin: https://nova-shop-admin.onrender.com/admin/
echo 4. Mot de passe: NovaShop1986*
pause

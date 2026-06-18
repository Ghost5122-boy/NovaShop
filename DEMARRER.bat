@echo off
title Nova Shop - Serveur
cd /d "%~dp0"
echo.
echo  Demarrage de Nova Shop...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1"
pause

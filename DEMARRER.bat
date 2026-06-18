@echo off
title Nova Shop - Hebergeur PC
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0host.ps1"
pause

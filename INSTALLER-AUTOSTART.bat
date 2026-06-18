@echo off
title Installer demarrage auto Nova Shop
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0install-autostart.ps1"

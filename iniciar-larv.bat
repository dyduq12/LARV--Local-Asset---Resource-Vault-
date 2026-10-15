@echo off
title LARV - Local Asset and Resource Vault
cd /d "%~dp0"
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ========================================================
    echo  [ERRO] Node.js nao foi encontrado no sistema!
    echo  Instale o Node.js v20+ em: https://nodejs.org
    echo ========================================================
    echo.
    pause
    exit /b 1
)
node scripts/launcher.cjs
if %errorlevel% neq 0 (
    pause
)

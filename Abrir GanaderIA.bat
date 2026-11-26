@echo off
chcp 65001 >nul
title GanaderIA - Gestion Ganadera Asturias
cd /d "%~dp0"

echo ========================================================
echo   GanaderIA - Gestion Ganadera y Tramites (Asturias)
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se ha encontrado Node.js instalado en este ordenador.
    echo Descargalo gratis desde https://nodejs.org y vuelve a hacer doble clic aqui.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Instalando componentes la primera vez... espera unos segundos.
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo [ERROR] No se pudieron instalar las dependencias.
        pause
        exit /b 1
    )
)

echo Iniciando GanaderIA y abriendo tu navegador...
echo.
echo IMPORTANTE: Deja esta ventana abierta mientras uses GanaderIA.
echo Cuando termines, puedes cerrarla sin problema (tus datos se guardan solos).
echo.

call npm.cmd run dev -- --open
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] El servidor se detuvo con un fallo.
    pause
)

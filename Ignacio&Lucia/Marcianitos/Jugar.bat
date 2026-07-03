@echo off
title Marcianitos de San Valentin - Lanzador
cd /d "%~dp0"

echo Comprobando entorno de Python y Pygame...
python -c "import pygame" 2>nul
if %errorlevel% neq 0 (
    echo Pygame no esta instalado en el entorno de Python actual.
    echo Instalando Pygame para este interprete de Python...
    python -m pip install pygame
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] No se pudo instalar Pygame. Por favor, asegúrate de tener Python instalado y conexion a Internet.
        pause
        exit /b
    )
)

echo.
echo Iniciando juego... ¡Diviertete!
python main.py
if %errorlevel% neq 0 (
    echo.
    echo El juego se ha cerrado inesperadamente o no se pudo iniciar.
    pause
)

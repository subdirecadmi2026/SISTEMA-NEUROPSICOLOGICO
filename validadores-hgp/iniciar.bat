@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Falta Node.js 20 o superior.
  echo Descarguelo en https://nodejs.org y vuelva a hacer doble clic aqui.
  pause
  exit /b 1
)

echo Instalando dependencias. La primera vez puede tardar unos minutos...
call npm install
if errorlevel 1 (
  echo No se pudo instalar. Revise la conexion a internet.
  pause
  exit /b 1
)

echo.
echo Abra en el navegador: http://localhost:5173
echo No cierre esta ventana mientras use los validadores.
echo.
call npm run dev -- --host --port 5173
pause

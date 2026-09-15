@echo off
title APP PROJECT - Local Server
cd /d "%~dp0"
echo Cek Node.js...
node -v >nul 2>&1
if %errorlevel%==0 (
  echo Node ketemu! Jalanin server...
  npx http-server -p 8000 -o
  pause
  exit
)

echo Node tidak ada, coba pakai PHP...
php -v >nul 2>&1
if %errorlevel%==0 (
  echo PHP ketemu! Jalanin server...
  php -S localhost:8000
  pause
  exit
)

echo.
echo ============================================
echo  GAK ADA PYTHON / NODE / PHP TERDETEKSI
echo ============================================
echo.
echo CARA PALING GAMPANG (tanpa install apapun):
echo 1. Install VSCode
echo 2. Install extension "Live Server" (Ritwick Dey)
echo 3. Klik kanan index.html -^> Open with Live Server
echo.
echo ATAU:
echo Buka folder ini di Explorer, drag file index.html ke Chrome,
echo tapi fitur PWA/IndexedDB akan tetap jalan walau tanpa server.
echo (Kecuali Service Worker, itu butuh server)
echo.
pause

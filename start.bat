@echo off
echo ============================================
echo   EBS - Einschulungsblatt Management System
echo ============================================
echo.

echo [1/3] Abhaengigkeiten werden installiert...
cd /d "%~dp0backend"
call npm install
if errorlevel 1 (
    echo FEHLER: Backend-Installation fehlgeschlagen!
    pause
    exit /b 1
)

cd /d "%~dp0frontend"
call npm install
if errorlevel 1 (
    echo FEHLER: Frontend-Installation fehlgeschlagen!
    pause
    exit /b 1
)

echo.
echo [2/3] Frontend wird gebaut...
call npm run build
if errorlevel 1 (
    echo FEHLER: Frontend-Build fehlgeschlagen!
    pause
    exit /b 1
)

echo.
echo [3/3] Server wird gestartet...
cd /d "%~dp0backend"
echo.
echo ============================================
echo   Server laeuft!
echo ============================================
echo.
echo   Schulportal:  http://localhost:3001/school/login
echo   Login:        admin@schule.de / Admin123!
echo.
echo   Eltern-Link:  http://localhost:3001/activate
echo.
echo   Dieses Fenster offen lassen!
echo   Zum Beenden: Ctrl+C
echo ============================================
echo.
node -e "require('tsx/cjs'); require('./src/index.ts')"
pause

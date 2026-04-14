@echo off
chcp 65001 >nul
title EBS - Automatisches Deployment Setup
color 0B

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   EBS - Automatisches Deployment Setup       ║
echo  ║   Dieses Script bereitet alles vor.          ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: ============================================
:: SCHRITT 1: Git pruefen / installieren
:: ============================================
echo [1/4] Pruefe ob Git installiert ist...
where git >nul 2>&1
if errorlevel 1 (
    echo.
    echo  Git ist nicht installiert!
    echo  Oeffne jetzt den Download-Link...
    start https://git-scm.com/download/win
    echo.
    echo  Bitte Git installieren (alles auf Standard lassen)
    echo  und dann dieses Script NOCHMAL starten.
    echo.
    pause
    exit /b 1
)
echo  [OK] Git gefunden:
git --version
echo.

:: ============================================
:: SCHRITT 2: GitHub Zugangsdaten abfragen
:: ============================================
echo [2/4] GitHub-Zugangsdaten eingeben
echo.
echo  Falls du noch keinen GitHub-Account hast:
echo  Oeffne https://github.com/signup und erstelle einen.
echo.
set /p GITHUB_USER="  Dein GitHub-Benutzername: "
echo.
echo  Du brauchst einen Personal Access Token (PAT):
echo  1. Gehe zu: https://github.com/settings/tokens
echo  2. Klicke "Generate new token (classic)"
echo  3. Name: coolify-deploy
echo  4. Haken bei "repo" setzen
echo  5. "Generate token" klicken und Token kopieren
echo.
echo  (Oeffne ich die Seite fuer dich? Druecke Enter...)
pause >nul
start https://github.com/settings/tokens/new
echo.
echo  Kopiere den Token und fuege ihn hier ein:
set /p GITHUB_TOKEN="  Dein Token: "

if "%GITHUB_USER%"=="" (
    echo FEHLER: Kein Benutzername eingegeben!
    pause
    exit /b 1
)
if "%GITHUB_TOKEN%"=="" (
    echo FEHLER: Kein Token eingegeben!
    pause
    exit /b 1
)

:: ============================================
:: SCHRITT 3: GitHub Repository erstellen
:: ============================================
echo.
echo [3/4] Erstelle GitHub-Repository...

:: Erstelle repo via GitHub API
curl -s -o nul -w "%%{http_code}" -X POST ^
  -H "Authorization: token %GITHUB_TOKEN%" ^
  -H "Accept: application/vnd.github.v3+json" ^
  https://api.github.com/user/repos ^
  -d "{\"name\":\"ebs-schulportal\",\"private\":true,\"description\":\"EBS - Einschulungsblatt Management System\"}" > "%TEMP%\gh_status.txt"

set /p GH_STATUS=<"%TEMP%\gh_status.txt"
del "%TEMP%\gh_status.txt" 2>nul

if "%GH_STATUS%"=="201" (
    echo  [OK] Repository erstellt: github.com/%GITHUB_USER%/ebs-schulportal
) else if "%GH_STATUS%"=="422" (
    echo  [OK] Repository existiert bereits - wird verwendet
) else (
    echo  [WARNUNG] Status %GH_STATUS% - versuche trotzdem fortzufahren...
)

:: ============================================
:: SCHRITT 4: Code hochladen
:: ============================================
echo.
echo [4/4] Lade Code auf GitHub hoch...

cd /d "%~dp0"

:: .gitignore erstellen falls nicht vorhanden
if not exist ".gitignore" (
    (
        echo node_modules/
        echo backend/node_modules/
        echo frontend/node_modules/
        echo backend/dist/
        echo frontend/dist/
        echo backend/ebs.db
        echo backend/documents/
        echo .env
        echo *.log
    ) > .gitignore
)

:: Git initialisieren
if not exist ".git" (
    git init
    git branch -M main
)

:: Remote setzen
git remote remove origin 2>nul
git remote add origin https://%GITHUB_USER%:%GITHUB_TOKEN%@github.com/%GITHUB_USER%/ebs-schulportal.git

:: Alles hinzufuegen und pushen
git add -A
git commit -m "EBS v1.0 - Einschulungsblatt Management System" 2>nul || echo  (Keine neuen Aenderungen)
git push -u origin main --force

if errorlevel 1 (
    echo.
    echo  FEHLER beim Upload! Pruefe Benutzername und Token.
    pause
    exit /b 1
)

:: Token aus remote entfernen (Sicherheit)
git remote set-url origin https://github.com/%GITHUB_USER%/ebs-schulportal.git

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║           FERTIG! Code ist auf GitHub.        ║
echo  ╚══════════════════════════════════════════════╝
echo.
echo  Repository: https://github.com/%GITHUB_USER%/ebs-schulportal
echo.
echo  ══════════════════════════════════════════════
echo  NAECHSTER SCHRITT: Coolify einrichten
echo  ══════════════════════════════════════════════
echo.
echo  1. Oeffne Coolify: http://178.104.45.32:8000
echo  2. Gehe zu "Projects" und klicke "+ Add"
echo  3. Name: "EBS Schulportal"
echo  4. Im Projekt: "+ New" klicken
echo  5. Waehle "Public Repository"
echo  6. Repository URL eingeben:
echo     https://github.com/%GITHUB_USER%/ebs-schulportal
echo  7. Build Pack: "Docker Compose"
echo  8. Klicke "Deploy"
echo.
echo  WICHTIG - Umgebungsvariablen in Coolify setzen:
echo     JWT_SECRET = (beliebiger langer Text)
echo     COOKIE_SECRET = (anderer langer Text)
echo.
pause

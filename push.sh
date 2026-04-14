#!/bin/bash
# EBS Schulportal - Auto-Push Script
# Ausführen mit: bash push.sh

set -e

echo "=== EBS Schulportal Push-Script ==="
echo ""

TOKEN=""
REPO_URL="https://github.com/Knoxx23/ebs-schulportal.git"

# Check if already a git repo
if [ ! -d ".git" ] || [ ! -f ".git/config" ]; then
    echo "Initialisiere Git-Repository..."
    rm -rf .git
    git init
    git remote add origin "$REPO_URL"
    git fetch origin main
    git checkout -b main FETCH_HEAD 2>/dev/null || git reset --mixed FETCH_HEAD
fi

# Ensure remote is set correctly
git remote set-url origin "$REPO_URL" 2>/dev/null || git remote add origin "$REPO_URL"

echo ""
echo "Aktueller Status:"
git status --short

echo ""
read -p "Alle Änderungen pushen? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[YyJj]$ ]]; then
    git add -A
    git commit -m "Security + DSGVO fixes

- JWT_SECRET erzwingen, Default-Admin zufällig
- Role-Checks, Path-Traversal-Schutz, Rate-Limiting
- HSTS, CSP, Email-Versand aktiviert
- Datenschutz/Impressum-Seiten, Consent, Daten-Export
- Retention-Service, Cookie-Banner
- File-Logger, Seed-Script, Deutsche Meldungen" || echo "Nichts zu committen"

    echo ""
    echo "Pushe zu GitHub..."
    git push origin main

    echo ""
    echo "✓ Push erfolgreich!"
    echo ""
    echo "Coolify deployed jetzt automatisch."
    echo "Deployment-Status: http://178.104.45.32:8000/project/n4flny1jf1eprdaph296hvfy/environment/sh4hgv3qv295gchc5flju438/application/a524qsczongphs0jrb5y8in4/deployments"
else
    echo "Abgebrochen."
fi

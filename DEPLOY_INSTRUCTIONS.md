# EBS Schulportal - Deploy-Anleitung

## Was wurde gemacht (diese Session)

### Code-Änderungen (25 Dateien, lokal gespeichert)

**Sicherheit:**
- JWT_SECRET wird beim Start erzwungen (App stoppt wenn fehlt oder < 32 Zeichen)
- Default-Admin-Passwort ist jetzt zufällig (wird einmalig in Logs angezeigt)
- Path-Traversal-Schutz in `backend/src/routes/documents.ts`
- Role-Checks auf `cases.ts`: nur Admin/Sekretariat/Schulleitung können genehmigen
- Rate-Limiting auf Password-Reset (5/h, 10/15min)
- HSTS + CSP Headers aktiviert
- Email-Versand aktiviert in `invitations.ts`

**DSGVO-Features:**
- Neue Seite `/datenschutz` (Datenschutzerklärung)
- Neue Seite `/impressum` (Impressum-Platzhalter)
- Consent-Checkbox vor Eltern-Formular
- `consent_log` Tabelle für Einwilligungs-Protokoll
- Neuer Endpoint `GET /api/parent/case/export` (DSGVO Art. 15 Auskunftsrecht)
- `retentionService.ts`: automatische Löschung nach 10 Jahren (DSGVO Art. 5)
- Cookie-Consent-Banner
- Footer mit Datenschutz/Impressum-Links

**Qualität:**
- File-Logger in `loggerService.ts`
- Test-Seed-Script (`npm run seed`)
- Alle Fehlermeldungen auf Deutsch
- Globaler Error-Handler

### Coolify-Konfiguration (fertig)
- JWT_SECRET ist gesetzt (lange Zufalls-Zeichen)
- Webhook-Secret gespeichert
- GitHub-Auto-Deploy-Webhook aktiv (ID: 606109255)

---

## Was du als Nächstes tun musst: Git Push

Die Code-Änderungen liegen in diesem Ordner aber sind noch NICHT auf GitHub.
Sobald du die Änderungen nach GitHub pushst, deployed Coolify automatisch.

### Option A: Git-Befehle direkt (empfohlen wenn du Git installiert hast)

Öffne ein Terminal in diesem Ordner und führe aus:

```bash
# Nur beim ersten Mal:
git init
git remote add origin https://github.com/Knoxx23/ebs-schulportal.git
git fetch origin main
git checkout -b main FETCH_HEAD

# Jedes Mal:
git add -A
git commit -m "Security + DSGVO fixes"
git push origin main
```

### Option B: Script ausführen

Das Script `push.sh` im gleichen Ordner macht alles automatisch:

```bash
bash push.sh
```

### Option C: Mich in nächster Session fragen

Wenn du den Push nicht selbst machen willst, sag mir in der nächsten Session
"Bitte pushe die lokalen Änderungen" - dann mache ich es Schritt für Schritt.

---

## Nach dem Push: Verifizieren

1. Coolify Deployment-Log prüfen: sollte automatisch starten
2. App aufrufen: https://a524qsczongphs0jrb5y8in4.178.104.45.32.sslip.io/
3. Datenschutzerklärung prüfen: `/datenschutz`
4. Impressum prüfen: `/impressum`

## Was noch fehlt (nächste Session)

- Impressum-Platzhalter mit echter Schul-Adresse füllen
- SMTP-Credentials für Email-Versand konfigurieren (sonst keine Einladungs-Emails)
- Admin-Passwort nach erstem Start ändern
- Test-Eltern-Durchlauf komplett durchspielen
- UI-Feinschliff

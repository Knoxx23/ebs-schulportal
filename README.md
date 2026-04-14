# EBS - Einschulungsblatt Management System

Webbasiertes System zur digitalen Verwaltung von Schuleinschreibungen. Eltern füllen online ein Formular aus, die Schule prüft und genehmigt die Einträge.

## Schnellstart (Lokal)

### Windows: Doppelklick auf `start.bat`

Das Script installiert alles, baut das Frontend und startet den Server.

**Oder manuell:**

```bash
# 1. Dependencies installieren
cd backend && npm install
cd ../frontend && npm install

# 2. Frontend bauen
cd frontend && npm run build

# 3. Server starten
cd backend && npm run dev
```

### Zugang

- **Schulportal**: http://localhost:3001/school/login
- **Admin-Login**: admin@schule.de / Admin123!
- **Eltern-Formular**: http://localhost:3001/activate

---

## Deployment auf Server (Coolify/Docker)

### Option 1: Docker Compose

```bash
docker-compose up -d
```

### Option 2: Coolify

1. In Coolify ein neues Projekt anlegen
2. "Docker Compose" als Typ wählen
3. Git-Repository verknüpfen oder Dateien hochladen
4. Umgebungsvariablen in Coolify setzen (siehe unten)
5. Deployen

### Umgebungsvariablen (Produktion)

| Variable | Beschreibung | Beispiel |
|----------|-------------|---------|
| `JWT_SECRET` | Geheimer Schlüssel für JWT | Zufällige Zeichenkette (32+ Zeichen) |
| `COOKIE_SECRET` | Geheimer Schlüssel für Cookies | Zufällige Zeichenkette (32+ Zeichen) |
| `APP_URL` | Öffentliche URL der App | `https://ebs.meine-schule.de` |
| `SMTP_HOST` | SMTP-Server (optional) | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP-Port | `587` |
| `SMTP_USER` | SMTP-Benutzer | `noreply@schule.de` |
| `SMTP_PASS` | SMTP-Passwort | `app-password` |
| `SMTP_FROM` | Absender-Adresse | `noreply@schule.de` |

---

## Architektur

| Schicht | Technologie |
|---------|------------|
| Backend | Node.js + Express + TypeScript |
| Datenbank | SQLite |
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Auth | JWT (Personal) + Session-Cookies (Eltern) |
| Dokumente | docxtemplater + pizzip |

## Workflow

1. Schulpersonal erstellt eine **Einladung** (Token + 6-Zeichen-Code)
2. Einladung wird an Eltern gesendet (URL + Code)
3. Eltern aktivieren den Link und füllen das 5-Schritte-Formular aus
4. Formular speichert automatisch bei jedem Schritt
5. Eltern reichen ein — Fall geht auf "Eingereicht"
6. Personal prüft im Dashboard, kann genehmigen oder zurückgeben
7. Bei Genehmigung wird ein .docx-Dokument aus der Vorlage generiert

## Sprachen

DE (Deutsch), EN (English), TR (Türkisch), AR (Arabisch), UA (Ukrainisch), RU (Russisch), PL (Polnisch)

## DSGVO

- Alle Daten werden in einer lokalen SQLite-Datenbank gespeichert
- 10-Jahres-Aufbewahrungsfrist mit automatischer Löschmarkierung
- Vollständiger Audit-Trail aller Aktionen
- Kein Tracking, keine externen Dienste
- Daten bleiben auf dem eigenen Server

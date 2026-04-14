# EBS Schulportal — Vollständige Projekt-Dokumentation

**Stand:** 14. April 2026
**Status:** Live deployed, ~70-75% production-ready
**Repository:** https://github.com/Knoxx23/ebs-schulportal
**Live URL:** https://a524qsczongphs0jrb5y8in4.178.104.45.32.sslip.io/

---

## 1. Projekt-Überblick

### Was ist EBS?

Das **Einschulungsblatt Management System (EBS)** ist eine Web-Anwendung für deutsche Grundschulen zur digitalen Verwaltung von Einschulungsblättern. Eltern erhalten per Einladungslink Zugang zu einem mehrstufigen Formular, in dem sie alle relevanten Daten ihres einzuschulenden Kindes erfassen. Das Schulpersonal (Lehrer, Sekretariat, Schulleitung) verwaltet diese Fälle, prüft sie, gibt sie frei und generiert offizielle Word-Dokumente.

### Zielgruppe / Rollen

- **Eltern** (kein Account, Zugang per Einladungstoken)
- **Lehrer** (`teacher`) — Lesezugriff auf eigene Klasse, Einladungen erstellen
- **Sekretariat** (`secretary`) — Cases bearbeiten/genehmigen
- **Schulleitung** (`principal`) — Cases bearbeiten/genehmigen
- **Administrator** (`admin`) — Vollzugriff inkl. Benutzerverwaltung, Audit-Log

### Geschäftsprozess

1. Schulpersonal erstellt Einladung für Eltern (mit Token + 6-stelligem Code)
2. Eltern erhalten Link per E-Mail (`/activate?token=...`)
3. Eltern bestätigen Code → Session aktiviert
4. Eltern füllen Formular in 5 Schritten aus (Person, Familie, Schule, Zukunft, Bestätigung)
5. Eltern reichen ein → Status `submitted`
6. Sekretariat prüft, kann zurückgeben (`returned` mit Note) oder genehmigen (`approved`)
7. Bei Genehmigung: Word-Dokument wird automatisch generiert
8. Nach 10 Jahren: Automatische Löschung (DSGVO-Konformität)

---

## 2. Tech Stack

### Backend
- **Runtime:** Node.js 20 (Alpine Linux im Docker)
- **Framework:** Express.js 4.18
- **Sprache:** TypeScript 5.3 (strict mode)
- **Datenbank:** SQLite via `sql.js` (WebAssembly-Implementierung, kein nativer Build nötig)
- **Auth:** JWT (jsonwebtoken) + bcryptjs (12 rounds)
- **Validierung:** zod (im Frontend), manual checks (im Backend)
- **Email:** nodemailer (SMTP)
- **Document Generation:** docxtemplater + pizzip (Word .docx aus Templates)
- **Scheduling:** node-cron (Reminder-Service, Retention-Service)
- **Security:** helmet, express-rate-limit, cookie-parser

### Frontend
- **Framework:** React 18.2 + TypeScript
- **Build Tool:** Vite 5.1
- **Styling:** Tailwind CSS 3.4 (utility-first, keine Komponenten-Bibliothek)
- **Routing:** React Router DOM 6
- **State Management:** Zustand 4.5 (für Auth-State)
- **HTTP Client:** Axios 1.6
- **Forms:** react-hook-form + zod resolver
- **i18n:** Eigene Lösung in `frontend/src/i18n/` (Deutsch + Englisch vorbereitet)

### Infrastructure
- **Hosting:** Hetzner Cloud CPX22 (4 vCPU, 8 GB RAM, 80 GB SSD)
- **Server-IP:** 178.104.45.32
- **OS:** Ubuntu 22.04
- **Container Runtime:** Docker 27.5.1 mit BuildKit
- **PaaS:** Coolify v4.0.0-beta.466 (Self-Hosted Heroku-Alternative)
- **Reverse Proxy:** Traefik (von Coolify gemanagt)
- **TLS:** sslip.io Wildcard-Zertifikat

---

## 3. Verzeichnis-Struktur

```
EBS Schulportal/
├── Dockerfile                          # Multi-Stage Docker Build
├── docker-compose.yml                  # Lokale Entwicklung
├── README.md
├── DEPLOY_INSTRUCTIONS.md              # Deploy-Anleitung
├── ANLEITUNG_GITHUB_DESKTOP.md         # GitHub Desktop für Marc
├── PROJEKT_DOKUMENTATION.md            # Diese Datei
├── push.sh                             # Push-Helper-Script
├── start.bat                           # Windows-Startup
├── deploy-setup.bat                    # Windows-Setup
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json                   # strict: true, target ES2020
│   └── src/
│       ├── index.ts                    # Express App, Server-Start
│       ├── database.ts                 # sql.js Wrapper, Schema-Definition
│       │
│       ├── middleware/
│       │   ├── auth.ts                 # requireAuth, requireRole, requireParentSession
│       │   └── rateLimit.ts            # 5 Rate-Limiter (Login, API, Parent, Reset)
│       │
│       ├── routes/
│       │   ├── auth.ts                 # POST /login, /logout, GET /me
│       │   ├── passwordReset.ts        # POST /request-reset, /reset-password
│       │   ├── parent.ts               # POST /activate, GET/PUT /case, /export
│       │   ├── cases.ts                # GET (list), GET (detail), PUT, POST /approve, /return
│       │   ├── invitations.ts          # POST, GET (list), DELETE
│       │   ├── documents.ts            # GET /:caseId (mit Path-Traversal-Schutz)
│       │   └── admin.ts                # GET /users, POST /users, PUT /users/:id, GET /audit
│       │
│       ├── services/
│       │   ├── auditService.ts         # auditLog() — schreibt in audit_log Tabelle
│       │   ├── documentService.ts      # generateDocument() — Word-Generation via docxtemplater
│       │   ├── emailService.ts         # sendInvitationEmail(), sendReminderEmail()
│       │   ├── reminderService.ts      # Cron-Job: erinnert pending invitations
│       │   ├── retentionService.ts     # Cron-Job: löscht cases nach 10 Jahren (DSGVO)
│       │   └── loggerService.ts        # File-Logger (JSON-Lines, /app/data/logs/)
│       │
│       └── scripts/
│           └── seed.ts                 # Test-Seed: 5 Users + 15 Invitations + 10 Cases
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── main.tsx                    # React-Root
        ├── App.tsx                     # Routing (BrowserRouter)
        ├── index.css                   # Tailwind base
        │
        ├── api/
        │   └── client.ts               # Axios-Instance mit Cookie-Auth
        │
        ├── stores/
        │   └── authStore.ts            # Zustand: user, login(), logout()
        │
        ├── i18n/                       # Übersetzungen (de/en)
        │
        ├── components/
        │   ├── CookieBanner.tsx        # DSGVO-Cookie-Consent
        │   └── Footer.tsx              # Footer mit Datenschutz/Impressum
        │
        └── pages/
            ├── PrivacyPage.tsx         # /datenschutz
            ├── ImprintPage.tsx         # /impressum
            │
            ├── parent/
            │   ├── ActivationPage.tsx  # /activate?token=... (Token + Code)
            │   ├── ParentFormPage.tsx  # /parent/form (Hauptseite)
            │   ├── StatusPage.tsx      # /parent/status (nach Submit)
            │   └── FormSteps/
            │       ├── Step1Person.tsx     # Kind-Daten + Consent-Checkbox
            │       ├── Step2Family.tsx     # Eltern-Daten
            │       ├── Step3School.tsx     # Kindergarten, Einschulung
            │       ├── Step4Future.tsx     # Bildungsweg (A/B/C/D)
            │       └── Step5Confirm.tsx    # Übersicht + Submit
            │
            └── school/
                ├── LoginPage.tsx
                ├── DashboardPage.tsx       # Übersicht, Statistik
                ├── CaseDetailPage.tsx      # Case-Detail + Edit/Approve/Return
                ├── AdminPage.tsx           # User-Management
                └── ResetPasswordPage.tsx
```

---

## 4. Datenbank-Schema (SQLite)

**Datei:** `/app/data/ebs.db` (im Docker-Volume `a524qsczongphs0jrb5y8in4-ebs-data`)
**Wrapper:** `backend/src/database.ts` — `DatabaseWrapper` Klasse über sql.js mit better-sqlite3-kompatibler API.

### Tabellen

#### `users` — Schulpersonal-Accounts
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | INTEGER PK | Auto-Increment |
| email | TEXT UNIQUE | Login-Email |
| password_hash | TEXT | bcrypt (12 rounds) |
| name | TEXT | Vollständiger Name |
| role | TEXT CHECK | `teacher`, `secretary`, `principal`, `admin` |
| is_active | INTEGER | 0/1 Soft-Delete |
| created_at | TEXT | ISO-Datum |
| last_login | TEXT | Letzter Login |
| failed_attempts | INTEGER | Brute-Force-Counter |
| locked_until | TEXT | Sperre bei zu vielen Versuchen |

#### `invitations` — Einladungen für Eltern
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | INTEGER PK | |
| token | TEXT UNIQUE | UUID v4, in URL |
| code | TEXT | 6-stelliger Code (A-Z, 2-9, ohne Verwechselbares) |
| child_last_name, child_first_name | TEXT | Optional vorab |
| class_ref | TEXT | z.B. "1a" |
| status | TEXT CHECK | `pending`, `activated`, `completed`, `expired` |
| created_by | INTEGER FK→users.id | |
| created_at, expires_at, activated_at | TEXT | |
| session_id | TEXT | Aktive Parent-Session |

#### `cases` — Einschulungsblätter
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | INTEGER PK | |
| invitation_id | INTEGER FK UNIQUE | 1:1-Beziehung |
| status | TEXT CHECK | `draft`, `submitted`, `returned`, `approved`, `archived` |
| last_name, first_name, birth_date, birth_place | TEXT | Kind-Daten |
| gender, nationality | TEXT | |
| guardian_name, guardian_street, guardian_zip, guardian_city | TEXT | Eltern |
| phone, email | TEXT | |
| kindergarten, enrollment_year, enrollment_date | TEXT | |
| future_path | TEXT CHECK | `A`/`B`/`C`/`D` (Bildungsweg-Empfehlung) |
| future_school, future_notes | TEXT | |
| language | TEXT | Default `de` |
| return_note | TEXT | Bei Rückgabe |
| document_path, document_hash | TEXT | Pfad zur generierten .docx |
| retention_delete_at | TEXT | Auto-Lösch-Datum (10 Jahre nach Approval) |
| deleted_at | TEXT | Soft-Delete |

#### `audit_log` — DSGVO-Audit
| Spalte | Typ |
|--------|-----|
| id, event_type | INTEGER PK, TEXT |
| actor_type | TEXT CHECK: `parent`, `staff`, `system` |
| actor_id | TEXT (User-ID oder Email) |
| case_id | INTEGER FK |
| details | TEXT (JSON) |
| ip_address, created_at | TEXT |

#### `reminders` — Geplante Erinnerungen
| Spalte | Beschreibung |
|--------|--------------|
| id, case_id, type (`email`/`sms`), trigger_type, sent_at, status |

#### `parent_sessions` — Eltern-Sessions
| Spalte | Beschreibung |
|--------|--------------|
| session_id (UUID), invitation_id, expires_at, ip_address |

#### `password_resets` — Reset-Tokens
| Spalte | Beschreibung |
|--------|--------------|
| user_id, token, expires_at, used (0/1) |

#### `consent_log` — DSGVO-Einwilligungen (NEU)
| Spalte | Beschreibung |
|--------|--------------|
| case_id, consent_type, given_at, ip_address, created_at |

### Indexes

```sql
idx_cases_status, idx_cases_invitation_id
idx_invitations_token, idx_invitations_status
idx_parent_sessions_session_id
idx_audit_log_case_id, idx_audit_log_created_at
idx_password_resets_token
idx_consent_log_case_id, idx_consent_log_created_at
```

---

## 5. API-Endpunkte

### Authentifizierung (`/api/auth`)

| Method | Path | Auth | Beschreibung |
|--------|------|------|--------------|
| POST | `/login` | — (Rate-Limited 10/15min) | `{email, password}` → Cookie `staff-token` (8h) |
| POST | `/logout` | requireAuth | Cookie löschen |
| GET | `/me` | requireAuth | Aktueller User |
| POST | `/request-reset` | — (Rate-Limited 5/h) | Sendet Reset-Link per Email |
| POST | `/reset-password` | — (Rate-Limited 10/15min) | `{token, newPassword}` |

### Eltern (`/api/parent`)

| Method | Path | Auth | Beschreibung |
|--------|------|------|--------------|
| POST | `/activate` | — (Rate-Limited 20/h) | `{token, code}` → Cookie `parent-session` |
| GET | `/case` | requireParentSession | Aktueller Case |
| PUT | `/case` | requireParentSession | Update + Consent-Log |
| POST | `/case/submit` | requireParentSession | Status `draft` → `submitted` |
| GET | `/case/export` | requireParentSession | DSGVO Art. 15 Daten-Export (JSON) |

### Cases (`/api/cases`)

| Method | Path | Auth | Beschreibung |
|--------|------|------|--------------|
| GET | `/` | requireAuth | Liste mit Filter: `status, class_ref, search`, Paginierung |
| GET | `/:id` | requireAuth | Detail + audit_history |
| PUT | `/:id` | requireRole(admin/secretary/principal) | Update |
| POST | `/:id/approve` | requireRole(admin/secretary/principal) | Genehmigen + Doc-Gen + Retention setzen |
| POST | `/:id/return` | requireRole(admin/secretary/principal) | Zurückgeben mit Note |

### Einladungen (`/api/invitations`)

| Method | Path | Auth | Beschreibung |
|--------|------|------|--------------|
| POST | `/` | requireRole(admin/secretary/teacher/principal) | Neue Einladung + Email |
| GET | `/` | requireRole(admin/secretary/teacher/principal) | Liste mit Filter |
| DELETE | `/:id` | requireRole(admin/secretary/principal) | Status `expired` (Soft) |

### Dokumente (`/api/documents`)

| Method | Path | Auth | Beschreibung |
|--------|------|------|--------------|
| GET | `/:caseId` | requireAuth | Word-Datei Download (mit Path-Traversal-Schutz) |

### Admin (`/api/admin`)

| Method | Path | Auth | Beschreibung |
|--------|------|------|--------------|
| GET | `/users` | requireRole(admin) | Alle User |
| POST | `/users` | requireRole(admin) | Neuer User |
| PUT | `/users/:id` | requireRole(admin) | Role/Status/Passwort ändern |
| GET | `/audit` | requireRole(admin) | Audit-Log mit Filter & Paginierung |

### System

| Method | Path | Auth | Beschreibung |
|--------|------|------|--------------|
| GET | `/api/health` | — | Health-Check JSON |

### CSRF-Schutz

Double-Submit-Cookie-Pattern in `index.ts`:
- GET/HEAD/OPTIONS setzen Cookie `csrf-token`
- POST/PUT/DELETE müssen Header `X-CSRF-Token` mit Cookie-Wert übereinstimmen
- Ausgenommen: `/api/parent/activate`, `/api/auth/login`, `/api/auth/reset-password`, `/api/auth/request-reset`

---

## 6. Frontend-Routen

```
/                            → Redirect (Login oder Dashboard)
/login                       → LoginPage (Schulpersonal)
/reset-password              → ResetPasswordPage
/datenschutz                 → PrivacyPage (DSGVO-Erklärung)
/impressum                   → ImprintPage (TMG)

/activate?token=...          → ActivationPage (Eltern, Code-Eingabe)
/parent/form                 → ParentFormPage (5 Steps)
/parent/status               → StatusPage (nach Submit)

/school/dashboard            → DashboardPage (Übersicht)
/school/cases/:id            → CaseDetailPage
/school/admin                → AdminPage (nur admin)
```

### State Management

`frontend/src/stores/authStore.ts` (Zustand):
```typescript
{
  user: { id, email, name, role } | null,
  login(email, password) → Promise,
  logout() → Promise,
  fetchMe() → Promise<void>
}
```

### API-Client

`frontend/src/api/client.ts`:
- Axios-Instance mit `withCredentials: true`
- Base-URL: `/api` (gleicher Origin wie Frontend)
- Auto-Inject `X-CSRF-Token` aus Cookie

---

## 7. Sicherheits-Features

### Authentifizierung
- **JWT** im httpOnly-Cookie (`staff-token`, 8h Gültigkeit)
- `JWT_SECRET` muss ≥ 32 Zeichen sein, sonst stoppt der Server beim Start
- **bcrypt** mit 12 Rounds für Passwort-Hashing
- **Account-Lockout**: 5 fehlgeschlagene Versuche → 15 Min gesperrt
- **Default-Admin** (`admin@schule.de`) bekommt beim ersten Start ein **zufälliges Passwort** (oder via `INITIAL_ADMIN_PASSWORD` Env), wird in Logs einmalig angezeigt

### Authorization
- `requireAuth` — JWT validieren + User-Aktivität prüfen
- `requireRole(...roles)` — Rollen-Check
- `requireParentSession` — Eltern-Cookie + Session in DB prüfen
- **Rollenmatrix:**
  - `teacher`: read cases, create invitations
  - `secretary`/`principal`: + edit cases, approve, return
  - `admin`: + user management, audit log

### Eingabevalidierung
- **Zod-Schemas** im Frontend (react-hook-form resolver)
- **Prepared Statements** im Backend (SQL-Injection-sicher)
- **Path-Traversal-Schutz** in `documents.ts`: `path.resolve()` muss mit `DOCUMENTS_PATH` starten

### Network-Security
- **Helmet** — CSP, X-Frame-Options, etc. (immer aktiv, auch in Dev)
- **HSTS** — 1 Jahr, includeSubDomains, preload
- **CORS** — nur same-origin in Production
- **CSRF** — Double-Submit-Cookie

### Rate-Limiting
| Endpoint | Limit |
|----------|-------|
| `POST /api/auth/login` | 10 / 15 min |
| `POST /api/auth/request-reset` | 5 / Stunde |
| `POST /api/auth/reset-password` | 10 / 15 min |
| `POST /api/parent/activate` | 20 / Stunde |
| Allgemein API | 100 / Minute |

### Audit-Log
Alle wichtigen Events in `audit_log`:
- `login_success`, `login_failed`, `logout`
- `user_created`, `user_updated`
- `invitation_created`, `invitation_revoked`
- `case_updated_by_staff`, `case_approved`, `case_returned`
- `document_downloaded`
- `parent_activated`, `case_submitted`, `consent_given`
- `retention_auto_delete`

---

## 8. DSGVO-Features

### Implementiert
- ✅ **Datenschutzerklärung** (`/datenschutz`) — Art. 6 Abs. 1 lit. c DSGVO i.V.m. Schulgesetz
- ✅ **Impressum** (`/impressum`) — § 5 TMG (mit Platzhaltern)
- ✅ **Cookie-Consent-Banner** — vor Cookie-Setzung
- ✅ **Consent-Checkbox** vor Eltern-Formular + Logging in `consent_log`
- ✅ **Auskunftsrecht (Art. 15)**: `GET /api/parent/case/export` → JSON mit allen Daten
- ✅ **Speicherbegrenzung (Art. 5)**: `retentionService.ts` löscht nach 10 Jahren
- ✅ **Audit-Log** für alle Datenzugriffe
- ✅ **Verschlüsselung in Transit** (HTTPS via Coolify/Traefik)

### Noch offen
- ⚠️ Echte Schul-Adresse statt Platzhalter in Datenschutz/Impressum
- ⚠️ Recht auf Löschung (Art. 17) — Endpoint fehlt für Eltern
- ⚠️ Datenübertragbarkeit (Art. 20) als CSV (aktuell nur JSON)
- ⚠️ Datenbank-Verschlüsselung at-rest
- ⚠️ Datenschutz-Folgenabschätzung (DSFA) extern dokumentieren

---

## 9. Deployment-Architektur

### Server: Hetzner CPX22
```
178.104.45.32 (Ubuntu 22.04)
├── Docker 27.5.1
├── Coolify v4.0.0-beta.466     → http://178.104.45.32:8000/
└── Containers:
    ├── coolify (Verwaltung)
    ├── coolify-db (Postgres für Coolify selbst)
    ├── coolify-proxy (Traefik)
    ├── coolify-redis
    └── ebs-app (knoxx23-ebs-schulportal-main)
        ├── Port: 3001 (intern)
        ├── Volume: a524qsczongphs0jrb5y8in4-ebs-data → /app/data
        └── Public URL: https://a524qsczongphs0jrb5y8in4.178.104.45.32.sslip.io
```

### Coolify-Konfiguration
- **App-UUID:** `a524qsczongphs0jrb5y8in4`
- **Build Pack:** Dockerfile (Multi-Stage)
- **Source:** GitHub `Knoxx23/ebs-schulportal`, Branch `main`
- **Auto-Deploy:** ✅ aktiviert via Webhook
- **Webhook-URL (für GitHub):** `https://m2ai.de/webhooks/source/github/events/manual`
- **Webhook-Secret:** `ebs-webhook-secret-2026-dsgvo-compliant`
- **GitHub-Webhook-ID:** 606109255

### Environment Variables (in Coolify gesetzt)
```
NODE_ENV=production
JWT_SECRET=<64-char-secret>          # ← gesetzt, ≥32 chars
COOKIE_SECRET=<secret>               # ← gesetzt
PORT=3001
DB_PATH=/app/data/ebs.db
DOCUMENTS_PATH=/app/data/documents
LOG_PATH=/app/data/logs
FRONTEND_DIST_PATH=/app/frontend/dist
```

### Noch zu setzen (für Email-Versand)
```
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@schule.de
FRONTEND_URL=https://a524qsczongphs0jrb5y8in4.178.104.45.32.sslip.io
INITIAL_ADMIN_PASSWORD=<optional, sonst zufällig>
```

### Dockerfile-Phasen
1. **frontend-build** — `node:20-alpine` → `npm ci && npm run build` → `/app/frontend/dist`
2. **backend-build** — `node:20-alpine` → `npm ci && npx tsc` → `/app/backend/dist`
3. **production** — `node:20-alpine` → nur Production-Deps + kompiliertes JS

---

## 10. Background-Services

### `reminderService.ts`
- Cron: jeden Tag 9:00 Uhr
- Sucht `invitations` mit Status `pending` deren `expires_at - 24h < NOW < expires_at`
- Sendet Erinnerungs-Email
- Schreibt in `reminders` Tabelle

### `retentionService.ts` (NEU)
- Cron: alle 24h
- Sucht `cases` mit `retention_delete_at <= NOW` und `deleted_at IS NULL`
- Löscht das `document_path`-File
- Setzt `deleted_at = NOW` (Soft-Delete)
- Audit-Log: `retention_auto_delete`

### `loggerService.ts` (NEU)
- File-basiert (`/app/data/logs/error.log`)
- JSON-Lines Format
- Auto-Rotation bei > 10 MB
- Filtert sensitive Daten (Passwörter, Tokens)

---

## 11. Lokale Entwicklung

### Voraussetzungen
- Node.js 20+
- npm 10+

### Setup
```bash
# Backend
cd backend
npm install
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
echo "COOKIE_SECRET=$(openssl rand -hex 32)" >> .env
echo "NODE_ENV=development" >> .env
npm run dev   # Port 3001

# Frontend (parallel)
cd frontend
npm install
npm run dev   # Port 5173, Proxy auf :3001

# Test-Daten generieren
cd backend
npm run seed
```

### Test-Accounts (nach Seed)
- `teacher1@schule.de` / `TestLehrer123!`
- `sekretariat@schule.de` / `TestSek123!`
- `schulleitung@schule.de` / `TestSchul123!`

---

## 12. Bekannte Issues / TODOs

### Kritisch
- ⚠️ **25 lokale Code-Änderungen** (Security + DSGVO) sind noch NICHT auf GitHub gepusht. Liegen lokal in diesem Ordner.
- ⚠️ **SMTP-Credentials** fehlen in Coolify → Einladungs-Emails werden nicht versendet
- ⚠️ **EBS_blanko.doc** Template ist Placeholder → genehmigte Cases bekommen nur einfaches Dokument

### Mittel
- ⚠️ Teacher kann Admin-Panel sehen (Frontend-Check fehlt — Backend ist gesichert)
- ⚠️ Reset-Password Email-Template hardcoded auf Englisch
- ⚠️ Keine Pagination im Audit-Log-Frontend
- ⚠️ Keine Tests (weder Unit noch E2E)
- ⚠️ Keine Migrations-Strategie (Schema-Änderungen brauchen DB-Reset)

### Gering
- TypeScript-Warnings bei einigen `as any` casts in DB-Code
- Reminder-Service hat keine Idempotenz-Garantie bei mehreren Container-Restarts
- Frontend-Bundle nicht code-gesplittet
- Keine Dockerfile-Cache-Optimierungen

---

## 13. Wichtige Credentials & URLs

### GitHub
- **Repo:** https://github.com/Knoxx23/ebs-schulportal
- **PAT (für Push):** `YOUR_GITHUB_PAT_HERE` ⚠️ **rotieren nach Übergabe**
- **Webhook-ID:** 606109255

### Coolify
- **URL:** http://178.104.45.32:8000/
- **App-Page:** http://178.104.45.32:8000/project/n4flny1jf1eprdaph296hvfy/environment/sh4hgv3qv295gchc5flju438/application/a524qsczongphs0jrb5y8in4
- **Login:** Marc's Coolify-Account

### Live-App
- **URL:** https://a524qsczongphs0jrb5y8in4.178.104.45.32.sslip.io/
- **Default-Admin nach Reset:** `admin@schule.de` / `<aus Container-Logs>`

---

## 14. Roadmap (Vorschlag)

### Sprint 1 (1 Woche) — Production-Ready
- [ ] Push der lokalen 25 Änderungen via GitHub Desktop
- [ ] SMTP-Credentials konfigurieren
- [ ] EBS_blanko.docx Template hinterlegen
- [ ] Default-Admin-Passwort ändern
- [ ] Echte Schul-Adresse in Datenschutz/Impressum
- [ ] End-to-End Test eines Eltern-Durchlaufs

### Sprint 2 (1 Woche) — Robustheit
- [ ] DB-Migrations-System (z.B. db-migrate)
- [ ] Unit-Tests für kritische Services (auth, audit, retention)
- [ ] E2E-Tests mit Playwright (Login → Case-Flow)
- [ ] Sentry oder ähnliches Error-Monitoring (DSGVO-konform self-hosted)
- [ ] Backup-Strategie für /app/data (Hetzner Volume Snapshots)

### Sprint 3 (2 Wochen) — Features Phase 2
- [ ] Recht auf Löschung für Eltern (DELETE /api/parent/case)
- [ ] Datenexport als CSV zusätzlich zu JSON
- [ ] Batch-Einladungen via CSV-Upload
- [ ] SMS-Reminder (Twilio)
- [ ] Mehrsprachige Email-Templates
- [ ] Dashboard-Statistiken (Completion-Rate pro Klasse)
- [ ] Export an externe Schulverwaltungssoftware

### Sprint 4 (1 Woche) — Hardening
- [ ] DB-Verschlüsselung at-rest
- [ ] Repo auf privat stellen
- [ ] PAT rotieren, Deploy-Key statt PAT
- [ ] DSFA dokumentieren
- [ ] Admin-Panel Frontend-Schutz

---

## 15. Onboarding-Checklist für neuen Entwickler

1. ☐ Zugang zu GitHub-Repo erhalten
2. ☐ Lokale Entwicklung aufsetzen (Abschnitt 11)
3. ☐ `npm run seed` ausführen, mit Test-Account anmelden
4. ☐ Eltern-Flow durchklicken (Invitation erstellen → activate → Form ausfüllen → submit)
5. ☐ Case genehmigen, Doc-Download testen
6. ☐ Coolify-Zugang von Marc bekommen
7. ☐ Kleinen Test-Commit pushen, Auto-Deploy verifizieren
8. ☐ Logs auf Server prüfen (`docker logs <container>`)
9. ☐ Audit-Log im Admin-Panel ansehen
10. ☐ Diese Doku komplett lesen, offene TODOs priorisieren

---

**Autor dieser Doku:** Claude (Cowork mode)
**Letzte Aktualisierung:** 14. April 2026
**Format:** Markdown (kompatibel mit GitHub, GitLab, VS Code Preview)

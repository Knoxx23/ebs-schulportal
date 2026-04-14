# Einfachster Weg: GitHub Desktop

Da der direkte Push zu komplex ist, hier der einfachste Weg in **3 Schritten**:

## Schritt 1: GitHub Desktop installieren (3 Min)

1. Gehe zu: https://desktop.github.com/
2. Lade GitHub Desktop herunter und installiere es
3. Beim ersten Start: Mit deinem GitHub-Account anmelden (Knoxx23)

## Schritt 2: Repo verbinden (1 Min)

1. In GitHub Desktop: **File → Clone Repository**
2. Wähle: `Knoxx23/ebs-schulportal`
3. **Wichtig:** Als Local Path wähle den **Schultest  EBS** Ordner (genau hier wo diese Datei liegt)
   - Falls eine Warnung kommt "Ordner ist nicht leer": Klicke "Add Repository"

## Schritt 3: Änderungen pushen (30 Sekunden)

GitHub Desktop zeigt dir jetzt automatisch alle 25 geänderten Dateien.

1. Im Feld "Summary": tippe `Security + DSGVO Fixes`
2. Klicke unten links auf **"Commit to main"**
3. Klicke oben auf **"Push origin"**

**Fertig!** Coolify deployed automatisch innerhalb von 1-2 Minuten.

---

## Was passiert dann?

- Coolify erkennt den Push automatisch (Webhook ist eingerichtet)
- Docker baut das Image neu (~2-3 Min)
- App wird live deployed
- Du kannst hier deployen sehen: http://178.104.45.32:8000/

## Falls etwas schiefgeht

Sag mir einfach in der nächsten Session "Deploy fehlgeschlagen" und ich schaue mir die Logs an.

## Alternative: Nicht selbst pushen

Wenn du GitHub Desktop nicht installieren willst, sag mir in der nächsten Session:
**"Pushe die Änderungen über den Server"**

Dann mache ich es Schritt-für-Schritt über den Hetzner-Server-Terminal. Ich brauche dafür eine frische Session mit vollem Arbeitsspeicher.

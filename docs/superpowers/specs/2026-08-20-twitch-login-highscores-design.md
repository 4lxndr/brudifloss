# Twitch-Login + Highscores je Spielmodus

Datum: 2026-08-20
Status: entworfen, vom Nutzer freigegeben (mündlich im Chat), Umsetzung folgt

## Ziel

Spieler können sich vor dem Spiel mit ihrem Twitch-Account anmelden. Eingeloggte
Spieler landen mit ihrem besten Lauf in einer globalen Bestenliste — getrennt je
Spielmodus (Klassik 600 m: Seetauglichkeits-Score, Endlos: Distanz in Metern).
Gäste dürfen weiterhin ohne Login spielen, erscheinen aber nicht in der Liste.

## Entscheidungen (aus dem Brainstorming)

- **Login optional:** Gast-Spiel bleibt möglich, Login-Button auf dem Startbildschirm.
- **Leaderboard-Platzierung:** Top 10 je Modus auf dem Startbildschirm (folgt dem
  gewählten Modus) und im Endscreen mit hervorgehobener eigener Platzierung.
- **Wertung:** Bester Lauf je Spieler je Modus — jeder Twitch-Nutzer taucht pro
  Modus genau einmal auf.
- **Architektur:** Worker-Backend + D1 (Variante A). KV (Race Conditions) und
  Durable Objects (Overkill) verworfen.
- **Mehrere Games:** Die D1-Datenbank heißt `brudivoeller` und wird von künftigen
  Brudi-Games mitbenutzt. Tabellen werden je Game gepräfixt; dieses Game nutzt
  das Präfix `floss_`.
- Twitch-App (Client-ID + Secret) existiert bereits beim Nutzer.

## Architektur

Der bisher rein statische Assets-Worker (`brudiflos`) bekommt ein Fetch-Backend.
Neuer Worker-Entry `src/worker/index.ts`; statische Assets laufen unverändert
über das `assets`-Binding (Worker greift nur bei `/auth/*` und `/api/*`).

### Endpunkte

| Route | Methode | Verhalten |
|---|---|---|
| `/auth/login` | GET | Redirect zu Twitch OAuth (authorization code flow). Nur Identitäts-Scope. `state`-Parameter wird als kurzlebiges Cookie gesetzt (CSRF-Schutz). |
| `/auth/callback` | GET | `state` prüfen, Code gegen Token tauschen, Twitch-User holen (ID, Login, Display-Name, Avatar), signiertes Session-Cookie setzen, Redirect auf `/`. |
| `/auth/me` | GET | `{user}` oder `{user: null}`. |
| `/auth/logout` | POST | Session-Cookie löschen. |
| `/api/scores?mode=classic\|endless` | GET | Top 10 (Rang, Name, Avatar, Wert, Datum) + eigene Platzierung/Gesamtzahl, falls eingeloggt. |
| `/api/scores` | POST | `{mode, value}`. Nur mit gültiger Session. Upsert: überschreibt nur, wenn `value` besser als bisheriger Bestwert. |

### Session

HttpOnly-Cookie, HMAC-SHA256-signiert (Payload: Twitch-ID, Login, Display-Name,
Avatar-URL, Ablauf 30 Tage). Kein serverseitiger Session-Store nötig.
`Secure`, `SameSite=Lax`, `Path=/`.

### Schutzmaßnahmen (bewusste Grenze: Client meldet Scores)

- Submit nur mit gültiger Session.
- Harte Plausibilitäts-Deckel: Klassik-Score > 10 000 und Endlos-Distanz > 50 000 m
  werden verworfen (HTTP 400).
- Rate-Limit: max. 1 Submit pro Nutzer pro 10 Sekunden (In-Memory je Isolate reicht).
- Bundle bleibt obfuskiert (bestehender Build-Schritt).
- Echte Manipulationssicherheit ist bei einem Browser-Spiel nicht erreichbar —
  akzeptiert.

## Datenbank (D1)

Datenbank `brudivoeller` (geteilt über künftige Games, Tabellen je Game gepräfixt):

```sql
CREATE TABLE IF NOT EXISTS floss_scores (
  twitch_id    TEXT NOT NULL,
  mode         TEXT NOT NULL CHECK (mode IN ('classic', 'endless')),
  value        INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url   TEXT NOT NULL DEFAULT '',
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (twitch_id, mode)
);
CREATE INDEX IF NOT EXISTS floss_scores_mode_value
  ON floss_scores (mode, value DESC);
```

Display-Name und Avatar werden bei jedem Submit aktualisiert (Twitch-Namen
können sich ändern). Migrationsdateien liegen unter `migrations/` und laufen
über `wrangler d1 migrations apply`.

## Frontend

- **Startbildschirm:** Login-Zone oben rechts. Ausgeloggt: Button
  „Mit Twitch anmelden" (Twitch-Lila #9146FF). Eingeloggt: Avatar + Name +
  Logout. Bestenliste Top 10 sichtbar, wechselt mit dem Modus-Switch
  (Klassik/Endlos).
- **Endscreen:** Eingeloggt wird das Ergebnis automatisch per POST übermittelt;
  bei persönlichem Bestwert wird die eigene Zeile in der Liste hervorgehoben
  und die Platzierung genannt („Platz 3 von 87"). Als Gast: Hinweis + Login-Button.
- Lokaler `localStorage`-Bestwert bleibt als Fallback für Gäste erhalten.
- Neues Frontend-Modul `src/leaderboard.ts` (API-Client + Rendering), Verdrahtung
  in `main.ts`/`sim.ts` am Endscreen.

## Konfiguration & Deployment

- `wrangler.jsonc`: `main: "src/worker/index.ts"`, D1-Binding `DB`
  (database `brudivoeller`), `vars.TWITCH_CLIENT_ID`.
- Secrets über `wrangler secret put`: `TWITCH_CLIENT_SECRET`, `SESSION_SECRET`.
- Twitch-App braucht als OAuth-Redirect-URLs:
  `https://floss.brudigames.app/auth/callback` und für lokale Entwicklung
  `http://localhost:8787/auth/callback`.
- Build unverändert (esbuild + Obfuskierung für das Spiel-Bundle); der Worker-Code
  wird von Wrangler selbst gebündelt und nicht obfuskiert.

## Tests

- Worker-Logik (Session-Signierung/-Prüfung, Score-Upsert, Plausibilitäts-Deckel,
  Mode-Validierung) mit `@cloudflare/vitest-pool-workers` und lokalem D1.
- OAuth-Flow manuell gegen die echte Twitch-App verifizieren (lokal + Prod).

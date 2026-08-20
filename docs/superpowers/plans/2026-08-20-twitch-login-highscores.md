# Twitch-Login + Highscores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Twitch-OAuth-Login (optional, Gäste dürfen spielen) und eine globale Bestenliste je Spielmodus (classic/endless) in D1, angezeigt auf Start- und Endscreen.

**Architecture:** Der bestehende Assets-Worker `brudiflos` bekommt einen Fetch-Handler (`src/worker/index.ts`) für `/auth/*` und `/api/*`; statische Assets laufen unverändert über das `assets`-Binding (Worker greift nur bei nicht-Asset-Pfaden). Scores liegen in der geteilten D1-DB `brudivoeller`, Tabelle `floss_scores`. Session = HMAC-signiertes HttpOnly-Cookie, kein Session-Store.

**Tech Stack:** Cloudflare Workers + D1, WebCrypto (HMAC-SHA256), Vitest mit `@cloudflare/vitest-pool-workers`, Frontend Vanilla-TS (esbuild-Bundle wie bisher).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-20-twitch-login-highscores-design.md` — bei Widerspruch gewinnt das Spec.
- D1-Datenbank heißt exakt `brudivoeller`; alle Tabellen dieses Spiels tragen das Präfix `floss_`.
- Modi heißen exakt `classic` und `endless` (API, DB, Frontend).
- Plausibilitäts-Deckel: classic ≤ 10000, endless ≤ 50000; Werte sind positive Ganzzahlen.
- Rate-Limit: max. 1 Score-Submit pro Nutzer pro 10 s (In-Memory je Isolate).
- Cookies: `floss_session` (30 Tage) und `floss_oauth_state` (10 min), beide `HttpOnly; Secure; SameSite=Lax; Path=/`.
- Prod-Domain: `https://floss-simulator.brudigames.app`; lokale Dev-URL: `http://localhost:8787`.
- UI-Texte auf Deutsch, Ton wie im Rest des Spiels; Twitch-Lila `#9146ff`.
- Frontend-Code (src/*.ts außer src/worker/) wird weiter mit esbuild gebündelt + obfuskiert; der Worker wird von Wrangler gebündelt und NICHT obfuskiert.
- Commit-Messages im Stil des Repos: Emoji + kurze deutsche Zeile, Co-Authored-By-Trailer.

---

### Task 1: Infrastruktur — Worker-Entry, D1, Migration, Vitest

**Files:**
- Create: `src/worker/index.ts`, `src/worker/tsconfig.json`, `migrations/0001_floss_scores.sql`, `vitest.config.ts`, `test/apply-migrations.ts`, `test/tsconfig.json`, `test/env.d.ts`, `.dev.vars`
- Modify: `wrangler.jsonc`, `package.json`, `tsconfig.json`, `.gitignore`
- Test: `test/smoke.spec.ts`

**Interfaces:**
- Produces: D1-Binding `env.DB` mit Tabelle `floss_scores`; Env-Interface `Env { DB: D1Database; TWITCH_CLIENT_ID: string; TWITCH_CLIENT_SECRET: string; SESSION_SECRET: string }` exportiert aus `src/worker/index.ts`; laufende Testumgebung (`npm test`).

- [ ] **Step 1: Dependencies installieren**

```powershell
npm install -D vitest@~3.2.0 @cloudflare/vitest-pool-workers @cloudflare/workers-types
```

- [ ] **Step 2: D1-Datenbank anlegen**

```powershell
npx wrangler d1 create brudivoeller
```

Expected: Ausgabe enthält `database_id`. Die ID für Step 3 notieren. (Falls „already exists": `npx wrangler d1 list` und ID von dort nehmen.)

- [ ] **Step 3: wrangler.jsonc erweitern**

Komplett ersetzen durch (echte `database_id` aus Step 2 eintragen; `TWITCH_CLIENT_ID` bleibt vorerst der Platzhalter `SETZE-MICH`, wird in Task 7 vom Nutzer geliefert):

```jsonc
{
  "name": "brudiflos",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-08-18",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./public"
  },
  "routes": [
    { "pattern": "floss-simulator.brudigames.app", "custom_domain": true }
  ],
  "vars": {
    "TWITCH_CLIENT_ID": "SETZE-MICH"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "brudivoeller",
      "database_id": "<ID-AUS-STEP-2>",
      "migrations_dir": "./migrations"
    }
  ],
  "observability": { "enabled": true }
}
```

- [ ] **Step 4: Migration schreiben**

`migrations/0001_floss_scores.sql`:

```sql
-- Bestenliste des Floß-Simulators. DB "brudivoeller" wird von mehreren
-- Brudi-Games geteilt, daher das Tabellen-Präfix "floss_".
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

- [ ] **Step 5: Minimalen Worker-Entry schreiben**

`src/worker/index.ts`:

```ts
/* Backend des Floß-Simulators: Twitch-Auth + Highscore-API.
   Statische Assets liefert das assets-Binding, bevor dieser Code läuft. */

export interface Env {
  DB: D1Database;
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  SESSION_SECRET: string;
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export default {
  async fetch(_req: Request, _env: Env): Promise<Response> {
    return json({ error: "not_found" }, 404);
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 6: Worker-tsconfig anlegen und Root-tsconfig abgrenzen**

`src/worker/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["."]
}
```

In `tsconfig.json` (Root) den `include`-Block ergänzen um ein `exclude`:

```json
  "include": ["src"],
  "exclude": ["src/worker"]
```

- [ ] **Step 7: Vitest-Setup**

`vitest.config.ts`:

```ts
import path from "node:path";
import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "migrations"));
  return {
    test: {
      include: ["test/**/*.spec.ts"],
      setupFiles: ["./test/apply-migrations.ts"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.jsonc" },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
              TWITCH_CLIENT_ID: "test-client-id",
              TWITCH_CLIENT_SECRET: "test-client-secret",
              SESSION_SECRET: "test-session-secret",
            },
          },
        },
      },
    },
  };
});
```

`test/apply-migrations.ts`:

```ts
import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
```

`test/env.d.ts`:

```ts
declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    TEST_MIGRATIONS: D1Migration[];
    TWITCH_CLIENT_ID: string;
    TWITCH_CLIENT_SECRET: string;
    SESSION_SECRET: string;
  }
}
```

`test/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-pool-workers"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["."]
}
```

- [ ] **Step 8: Smoke-Test schreiben**

`test/smoke.spec.ts`:

```ts
import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Infrastruktur", () => {
  it("Migration hat floss_scores angelegt", async () => {
    const row = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='floss_scores'",
    ).first<{ name: string }>();
    expect(row?.name).toBe("floss_scores");
  });

  it("unbekannte Route liefert 404-JSON", async () => {
    const res = await SELF.fetch("https://example.com/gibtsnicht");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });
});
```

- [ ] **Step 9: package.json-Scripts + .dev.vars + .gitignore**

In `package.json` scripts ändern/ergänzen:

```json
"typecheck": "tsc --noEmit && tsc --noEmit -p src/worker && tsc --noEmit -p test",
"test": "vitest run",
```

`.dev.vars` (lokale Entwicklung; Platzhalter reichen bis Task 7):

```
TWITCH_CLIENT_SECRET=dev-platzhalter
SESSION_SECRET=dev-session-geheimnis
```

In `.gitignore` unter „Sonstiges" ergänzen:

```
# Lokale Secrets
.dev.vars
```

- [ ] **Step 10: Tests + Typecheck laufen lassen**

Run: `npm test` → Expected: 2 Tests PASS.
Run: `npm run typecheck` → Expected: keine Fehler.

- [ ] **Step 11: Migration lokal anwenden (für wrangler dev)**

```powershell
npx wrangler d1 migrations apply brudivoeller --local
```

Expected: `0001_floss_scores.sql` applied.

- [ ] **Step 12: Commit**

```powershell
git add -A && git commit -m @'
🧱 Worker-Backend-Grundgeruest: D1 "brudivoeller", floss_scores, Vitest

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 2: Session-Modul (signierte Cookies)

**Files:**
- Create: `src/worker/session.ts`
- Test: `test/session.spec.ts`

**Interfaces:**
- Produces:
  - `interface SessionUser { id: string; login: string; name: string; avatar: string }`
  - `createSession(user: SessionUser, secret: string, now?: number): Promise<string>`
  - `verifySession(token: string | null, secret: string, now?: number): Promise<SessionUser | null>`
  - `sessionCookie(token: string): string` / `clearSessionCookie(): string`
  - `getCookie(header: string | null, name: string): string | null`

- [ ] **Step 1: Failing Tests schreiben**

`test/session.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createSession,
  verifySession,
  sessionCookie,
  clearSessionCookie,
  getCookie,
  type SessionUser,
} from "../src/worker/session";

const user: SessionUser = { id: "42", login: "brudi", name: "Brudivoeller_TV", avatar: "https://x/y.png" };
const SECRET = "test-geheimnis";

describe("session", () => {
  it("Roundtrip: erstellen und verifizieren", async () => {
    const token = await createSession(user, SECRET);
    expect(await verifySession(token, SECRET)).toEqual(user);
  });

  it("manipulierte Signatur wird abgelehnt", async () => {
    const token = await createSession(user, SECRET);
    const [body] = token.split(".");
    expect(await verifySession(`${body}.kaputt`, SECRET)).toBeNull();
  });

  it("falsches Secret wird abgelehnt", async () => {
    const token = await createSession(user, SECRET);
    expect(await verifySession(token, "anderes-geheimnis")).toBeNull();
  });

  it("abgelaufene Session wird abgelehnt", async () => {
    const token = await createSession(user, SECRET, 0);
    const after31Days = 31 * 24 * 3600 * 1000;
    expect(await verifySession(token, SECRET, after31Days)).toBeNull();
  });

  it("Müll und null werden abgelehnt", async () => {
    expect(await verifySession(null, SECRET)).toBeNull();
    expect(await verifySession("kein.token", SECRET)).toBeNull();
    expect(await verifySession("###", SECRET)).toBeNull();
  });

  it("Cookie-Strings", () => {
    expect(sessionCookie("abc")).toBe(
      "floss_session=abc; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    expect(clearSessionCookie()).toBe(
      "floss_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
  });

  it("getCookie parst Header", () => {
    expect(getCookie("a=1; floss_session=tok.en; b=2", "floss_session")).toBe("tok.en");
    expect(getCookie("a=1", "floss_session")).toBeNull();
    expect(getCookie(null, "floss_session")).toBeNull();
  });
});
```

- [ ] **Step 2: Testlauf — muss fehlschlagen**

Run: `npx vitest run test/session.spec.ts`
Expected: FAIL („Cannot find module … session")

- [ ] **Step 3: Implementierung**

`src/worker/session.ts`:

```ts
/* Signierte Sessions als HttpOnly-Cookie: HMAC-SHA256, kein Server-Store. */

export interface SessionUser {
  id: string;
  login: string;
  name: string;
  avatar: string;
}

const enc = new TextEncoder();
const SESSION_MAX_AGE_S = 30 * 24 * 3600;

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSession(
  user: SessionUser,
  secret: string,
  now: number = Date.now(),
): Promise<string> {
  const payload = { ...user, exp: now + SESSION_MAX_AGE_S * 1000 };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

export async function verifySession(
  token: string | null,
  secret: string,
  now: number = Date.now(),
): Promise<SessionUser | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let sigBytes: Uint8Array;
  try {
    sigBytes = b64urlDecode(sig);
  } catch {
    return null;
  }
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), sigBytes, enc.encode(body));
  if (!ok) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (typeof data.exp !== "number" || data.exp < now) return null;
    const { id, login, name, avatar } = data;
    if ([id, login, name, avatar].some((v) => typeof v !== "string")) return null;
    return { id, login, name, avatar };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  return `floss_session=${token}; Max-Age=${SESSION_MAX_AGE_S}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return `floss_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function getCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}
```

- [ ] **Step 4: Tests grün**

Run: `npx vitest run test/session.spec.ts` → Expected: alle PASS.
Run: `npm run typecheck` → Expected: keine Fehler.

- [ ] **Step 5: Commit**

```powershell
git add src/worker/session.ts test/session.spec.ts && git commit -m @'
🍪 Signierte Twitch-Sessions als HttpOnly-Cookie (HMAC-SHA256)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 3: Scores-Modul (Validierung, Upsert, Bestenliste)

**Files:**
- Create: `src/worker/scores.ts`
- Test: `test/scores.spec.ts`

**Interfaces:**
- Consumes: `SessionUser` aus `src/worker/session.ts`; Tabelle `floss_scores` (Task 1).
- Produces:
  - `type Mode = "classic" | "endless"`; `const CAPS: Record<Mode, number>` (classic 10000, endless 50000)
  - `validateScore(mode: unknown, value: unknown): { mode: Mode; value: number } | null`
  - `upsertScore(db: D1Database, user: SessionUser, mode: Mode, value: number): Promise<void>`
  - `getBoard(db: D1Database, mode: Mode, twitchId?: string): Promise<Board>` mit
    `interface BoardRow { rank: number; name: string; avatar: string; value: number; self: boolean }`
    `interface Board { top: BoardRow[]; me: { rank: number; value: number; total: number } | null }`

- [ ] **Step 1: Failing Tests schreiben**

`test/scores.spec.ts`:

```ts
import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { validateScore, upsertScore, getBoard } from "../src/worker/scores";
import type { SessionUser } from "../src/worker/session";

const brudi: SessionUser = { id: "1", login: "brudi", name: "Brudi", avatar: "a1" };
const gast = (n: number): SessionUser => ({ id: String(100 + n), login: `g${n}`, name: `Gast${n}`, avatar: "" });

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM floss_scores").run();
});

describe("validateScore", () => {
  it("akzeptiert gültige Werte", () => {
    expect(validateScore("classic", 1234)).toEqual({ mode: "classic", value: 1234 });
    expect(validateScore("endless", 50000)).toEqual({ mode: "endless", value: 50000 });
  });
  it("lehnt Deckel-Überschreitung, Nicht-Ganzzahlen, <=0 und falsche Modi ab", () => {
    expect(validateScore("classic", 10001)).toBeNull();
    expect(validateScore("endless", 50001)).toBeNull();
    expect(validateScore("classic", 12.5)).toBeNull();
    expect(validateScore("classic", 0)).toBeNull();
    expect(validateScore("classic", -5)).toBeNull();
    expect(validateScore("classic", "9" as unknown)).toBeNull();
    expect(validateScore("speedrun", 10)).toBeNull();
  });
});

describe("upsertScore", () => {
  it("legt an und behält nur den Bestwert", async () => {
    await upsertScore(env.DB, brudi, "classic", 500);
    await upsertScore(env.DB, brudi, "classic", 300);
    let board = await getBoard(env.DB, "classic", brudi.id);
    expect(board.me).toMatchObject({ rank: 1, value: 500 });
    await upsertScore(env.DB, brudi, "classic", 900);
    board = await getBoard(env.DB, "classic", brudi.id);
    expect(board.me).toMatchObject({ rank: 1, value: 900 });
  });

  it("aktualisiert Name/Avatar auch ohne neuen Bestwert", async () => {
    await upsertScore(env.DB, brudi, "classic", 500);
    await upsertScore(env.DB, { ...brudi, name: "NeuerName", avatar: "a2" }, "classic", 100);
    const board = await getBoard(env.DB, "classic");
    expect(board.top[0]).toMatchObject({ name: "NeuerName", avatar: "a2", value: 500 });
  });

  it("Modi sind getrennt", async () => {
    await upsertScore(env.DB, brudi, "classic", 500);
    await upsertScore(env.DB, brudi, "endless", 777);
    expect((await getBoard(env.DB, "classic")).top[0].value).toBe(500);
    expect((await getBoard(env.DB, "endless")).top[0].value).toBe(777);
  });
});

describe("getBoard", () => {
  it("Top 10 absteigend, self-Flag, Rang außerhalb der Top 10", async () => {
    for (let i = 1; i <= 12; i++) await upsertScore(env.DB, gast(i), "classic", i * 100);
    await upsertScore(env.DB, brudi, "classic", 50); // Platz 13
    const board = await getBoard(env.DB, "classic", brudi.id);
    expect(board.top).toHaveLength(10);
    expect(board.top[0]).toMatchObject({ rank: 1, value: 1200, self: false });
    expect(board.top[9]).toMatchObject({ rank: 10, value: 300 });
    expect(board.me).toEqual({ rank: 13, value: 50, total: 13 });
  });

  it("markiert die eigene Zeile", async () => {
    await upsertScore(env.DB, brudi, "classic", 500);
    const board = await getBoard(env.DB, "classic", brudi.id);
    expect(board.top[0].self).toBe(true);
  });

  it("leer + ohne Login", async () => {
    const board = await getBoard(env.DB, "classic");
    expect(board).toEqual({ top: [], me: null });
  });
});
```

- [ ] **Step 2: Testlauf — muss fehlschlagen**

Run: `npx vitest run test/scores.spec.ts`
Expected: FAIL („Cannot find module … scores")

- [ ] **Step 3: Implementierung**

`src/worker/scores.ts`:

```ts
/* Highscore-Zugriff auf D1: ein Eintrag je Spieler und Modus, nur Bestwert zählt. */

import type { SessionUser } from "./session";

export type Mode = "classic" | "endless";

export const CAPS: Record<Mode, number> = { classic: 10_000, endless: 50_000 };

export interface BoardRow {
  rank: number;
  name: string;
  avatar: string;
  value: number;
  self: boolean;
}

export interface Board {
  top: BoardRow[];
  me: { rank: number; value: number; total: number } | null;
}

export function parseMode(m: unknown): Mode | null {
  return m === "classic" || m === "endless" ? m : null;
}

export function validateScore(mode: unknown, value: unknown): { mode: Mode; value: number } | null {
  const m = parseMode(mode);
  if (!m) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0 || value > CAPS[m]) {
    return null;
  }
  return { mode: m, value };
}

export async function upsertScore(
  db: D1Database,
  user: SessionUser,
  mode: Mode,
  value: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO floss_scores (twitch_id, mode, value, display_name, avatar_url, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT (twitch_id, mode) DO UPDATE SET
         value = MAX(floss_scores.value, excluded.value),
         display_name = excluded.display_name,
         avatar_url = excluded.avatar_url,
         updated_at = CASE
           WHEN excluded.value > floss_scores.value THEN excluded.updated_at
           ELSE floss_scores.updated_at
         END`,
    )
    .bind(user.id, mode, value, user.name, user.avatar, new Date().toISOString())
    .run();
}

export async function getBoard(db: D1Database, mode: Mode, twitchId?: string): Promise<Board> {
  const { results } = await db
    .prepare(
      `SELECT twitch_id, display_name, avatar_url, value
       FROM floss_scores WHERE mode = ?1
       ORDER BY value DESC, updated_at ASC LIMIT 10`,
    )
    .bind(mode)
    .all<{ twitch_id: string; display_name: string; avatar_url: string; value: number }>();

  const top: BoardRow[] = results.map((r, i) => ({
    rank: i + 1,
    name: r.display_name,
    avatar: r.avatar_url,
    value: r.value,
    self: twitchId !== undefined && r.twitch_id === twitchId,
  }));

  let me: Board["me"] = null;
  if (twitchId !== undefined) {
    const mine = await db
      .prepare(`SELECT value FROM floss_scores WHERE mode = ?1 AND twitch_id = ?2`)
      .bind(mode, twitchId)
      .first<{ value: number }>();
    if (mine) {
      const stats = await db
        .prepare(
          `SELECT COUNT(*) AS total,
                  SUM(CASE WHEN value > ?2 THEN 1 ELSE 0 END) AS better
           FROM floss_scores WHERE mode = ?1`,
        )
        .bind(mode, mine.value)
        .first<{ total: number; better: number }>();
      me = { rank: (stats?.better ?? 0) + 1, value: mine.value, total: stats?.total ?? 0 };
    }
  }
  return { top, me };
}
```

- [ ] **Step 4: Tests grün**

Run: `npx vitest run test/scores.spec.ts` → Expected: alle PASS.
Run: `npm run typecheck` → Expected: keine Fehler.

- [ ] **Step 5: Commit**

```powershell
git add src/worker/scores.ts test/scores.spec.ts && git commit -m @'
🏆 Score-Logik: Bestwert-Upsert + Top-10-Board je Modus in D1

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 4: API-Routen `/api/scores` (GET + POST, Rate-Limit)

**Files:**
- Modify: `src/worker/index.ts`
- Test: `test/api.spec.ts`

**Interfaces:**
- Consumes: `verifySession`, `getCookie`, `createSession` (Task 2); `validateScore`, `parseMode`, `upsertScore`, `getBoard` (Task 3).
- Produces: `GET /api/scores?mode=<mode>` → `Board`-JSON; `POST /api/scores` mit Body `{"mode": "...", "value": n}` → `Board`-JSON (Fehler: 400 `{"error":"bad_request"}`, 401 `{"error":"login_required"}`, 429 `{"error":"slow_down"}`).

- [ ] **Step 1: Failing Tests schreiben**

`test/api.spec.ts`:

```ts
import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createSession, type SessionUser } from "../src/worker/session";
import type { Board } from "../src/worker/scores";

const cookieFor = async (u: SessionUser) =>
  `floss_session=${await createSession(u, env.SESSION_SECRET)}`;

const brudi: SessionUser = { id: "1", login: "brudi", name: "Brudi", avatar: "a" };

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM floss_scores").run();
});

describe("GET /api/scores", () => {
  it("leeres Board ohne Login", async () => {
    const res = await SELF.fetch("https://x/api/scores?mode=classic");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ top: [], me: null });
  });

  it("400 bei fehlendem/ungültigem mode", async () => {
    expect((await SELF.fetch("https://x/api/scores")).status).toBe(400);
    expect((await SELF.fetch("https://x/api/scores?mode=yolo")).status).toBe(400);
  });
});

describe("POST /api/scores", () => {
  it("401 ohne Session", async () => {
    const res = await SELF.fetch("https://x/api/scores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "classic", value: 100 }),
    });
    expect(res.status).toBe(401);
  });

  it("speichert mit Session und liefert Board mit eigener Platzierung", async () => {
    const res = await SELF.fetch("https://x/api/scores", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: await cookieFor(brudi) },
      body: JSON.stringify({ mode: "endless", value: 432 }),
    });
    expect(res.status).toBe(200);
    const board = (await res.json()) as Board;
    expect(board.top[0]).toMatchObject({ name: "Brudi", value: 432, self: true });
    expect(board.me).toEqual({ rank: 1, value: 432, total: 1 });
  });

  it("400 bei Deckel-Überschreitung und Müll-Body", async () => {
    const cookie = await cookieFor(brudi);
    const post = (body: string) =>
      SELF.fetch("https://x/api/scores", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body,
      });
    expect((await post(JSON.stringify({ mode: "classic", value: 10001 }))).status).toBe(400);
    expect((await post("kein json")).status).toBe(400);
  });

  it("429 bei zweitem Submit innerhalb 10 s", async () => {
    const cookie = await cookieFor({ id: "99", login: "x", name: "X", avatar: "" });
    const post = () =>
      SELF.fetch("https://x/api/scores", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ mode: "classic", value: 100 }),
      });
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(429);
  });
});
```

- [ ] **Step 2: Testlauf — muss fehlschlagen**

Run: `npx vitest run test/api.spec.ts`
Expected: FAIL (Routen existieren nicht, 404 statt 200/400/401).

- [ ] **Step 3: Router implementieren**

`src/worker/index.ts` komplett ersetzen:

```ts
/* Backend des Floß-Simulators: Twitch-Auth + Highscore-API.
   Statische Assets liefert das assets-Binding, bevor dieser Code läuft. */

import { getCookie, verifySession, type SessionUser } from "./session";
import { getBoard, parseMode, upsertScore, validateScore } from "./scores";

export interface Env {
  DB: D1Database;
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  SESSION_SECRET: string;
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

// Rate-Limit je Isolate: reicht als Bremse, kein exaktes globales Limit.
const lastSubmit = new Map<string, number>();
const SUBMIT_COOLDOWN_MS = 10_000;

async function sessionUser(req: Request, env: Env): Promise<SessionUser | null> {
  return verifySession(getCookie(req.headers.get("cookie"), "floss_session"), env.SESSION_SECRET);
}

async function scoresGet(req: Request, url: URL, env: Env): Promise<Response> {
  const mode = parseMode(url.searchParams.get("mode"));
  if (!mode) return json({ error: "bad_request" }, 400);
  const user = await sessionUser(req, env);
  return json(await getBoard(env.DB, mode, user?.id));
}

async function scoresPost(req: Request, env: Env): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return json({ error: "login_required" }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const parsed = validateScore((body as any)?.mode, (body as any)?.value);
  if (!parsed) return json({ error: "bad_request" }, 400);

  // Rate-Limit erst nach der Validierung, damit Müll-Requests 400 statt 429 sehen
  const last = lastSubmit.get(user.id) ?? 0;
  if (Date.now() - last < SUBMIT_COOLDOWN_MS) return json({ error: "slow_down" }, 429);
  lastSubmit.set(user.id, Date.now());
  await upsertScore(env.DB, user, parsed.mode, parsed.value);
  return json(await getBoard(env.DB, parsed.mode, user.id));
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    try {
      if (url.pathname === "/api/scores" && req.method === "GET") return scoresGet(req, url, env);
      if (url.pathname === "/api/scores" && req.method === "POST") return scoresPost(req, env);
    } catch (err) {
      console.error("worker error", err);
      return json({ error: "server_error" }, 500);
    }
    return json({ error: "not_found" }, 404);
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 4: Tests grün**

Run: `npm test` → Expected: alle Tests PASS (smoke + session + scores + api).
Run: `npm run typecheck` → Expected: keine Fehler.

- [ ] **Step 5: Commit**

```powershell
git add src/worker/index.ts test/api.spec.ts && git commit -m @'
🔌 /api/scores: Top-10 lesen, Bestwert einreichen (Session + Rate-Limit)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 5: Twitch-OAuth-Routen (`/auth/*`)

**Files:**
- Create: `src/worker/twitch.ts`
- Modify: `src/worker/index.ts`
- Test: `test/auth.spec.ts`

**Interfaces:**
- Consumes: `createSession`, `verifySession`, `sessionCookie`, `clearSessionCookie`, `getCookie` (Task 2); `json`, `Env` (Task 4).
- Produces: Routen `GET /auth/login`, `GET /auth/callback`, `GET /auth/me` (→ `{"user": SessionUser | null}`), `POST /auth/logout`; `exchangeCode(code, clientId, clientSecret, redirectUri): Promise<string>` und `fetchUser(token, clientId): Promise<SessionUser>` aus `twitch.ts`.

- [ ] **Step 1: Failing Tests schreiben**

`test/auth.spec.ts`:

```ts
import { env, fetchMock, SELF } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createSession, type SessionUser } from "../src/worker/session";

const brudi: SessionUser = { id: "42", login: "brudi", name: "Brudivoeller_TV", avatar: "https://a/b.png" };

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});
afterEach(() => fetchMock.assertNoPendingInterceptors());

describe("/auth/login", () => {
  it("leitet zu Twitch weiter und setzt state-Cookie", async () => {
    const res = await SELF.fetch("https://x/auth/login", { redirect: "manual" });
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.origin).toBe("https://id.twitch.tv");
    expect(loc.pathname).toBe("/oauth2/authorize");
    expect(loc.searchParams.get("client_id")).toBe("test-client-id");
    expect(loc.searchParams.get("redirect_uri")).toBe("https://x/auth/callback");
    expect(loc.searchParams.get("response_type")).toBe("code");
    const state = loc.searchParams.get("state")!;
    expect(res.headers.get("set-cookie")).toContain(`floss_oauth_state=${state}`);
  });
});

describe("/auth/callback", () => {
  it("400 bei state-Mismatch", async () => {
    const res = await SELF.fetch("https://x/auth/callback?code=c&state=fremd", {
      redirect: "manual",
      headers: { cookie: "floss_oauth_state=anders" },
    });
    expect(res.status).toBe(400);
  });

  it("Happy Path: Token tauschen, User holen, Session setzen", async () => {
    fetchMock
      .get("https://id.twitch.tv")
      .intercept({ method: "POST", path: "/oauth2/token" })
      .reply(200, { access_token: "tok123" });
    fetchMock
      .get("https://api.twitch.tv")
      .intercept({ path: "/helix/users" })
      .reply(200, {
        data: [{ id: "42", login: "brudi", display_name: "Brudivoeller_TV", profile_image_url: "https://a/b.png" }],
      });

    const res = await SELF.fetch("https://x/auth/callback?code=c&state=s1", {
      redirect: "manual",
      headers: { cookie: "floss_oauth_state=s1" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith("floss_session=") && c.includes("HttpOnly"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("floss_oauth_state=;"))).toBe(true);
  });
});

describe("/auth/me + /auth/logout", () => {
  it("me ohne Cookie → user null", async () => {
    const res = await SELF.fetch("https://x/auth/me");
    expect(await res.json()).toEqual({ user: null });
  });

  it("me mit gültiger Session → user", async () => {
    const cookie = `floss_session=${await createSession(brudi, env.SESSION_SECRET)}`;
    const res = await SELF.fetch("https://x/auth/me", { headers: { cookie } });
    expect(await res.json()).toEqual({ user: brudi });
  });

  it("logout löscht Cookie", async () => {
    const res = await SELF.fetch("https://x/auth/logout", { method: "POST" });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("floss_session=;");
  });
});
```

- [ ] **Step 2: Testlauf — muss fehlschlagen**

Run: `npx vitest run test/auth.spec.ts`
Expected: FAIL (Routen liefern 404).

- [ ] **Step 3: Twitch-Client implementieren**

`src/worker/twitch.ts`:

```ts
/* Schmaler Client für Twitch-OAuth (id.twitch.tv) und Helix-User-API. */

import type { SessionUser } from "./session";

export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<string> {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Twitch-Token-Tausch fehlgeschlagen: ${res.status}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Twitch-Antwort ohne access_token");
  return data.access_token;
}

export async function fetchUser(token: string, clientId: string): Promise<SessionUser> {
  const res = await fetch("https://api.twitch.tv/helix/users", {
    headers: { authorization: `Bearer ${token}`, "client-id": clientId },
  });
  if (!res.ok) throw new Error(`Twitch-User-Abruf fehlgeschlagen: ${res.status}`);
  const data = (await res.json()) as {
    data?: { id: string; login: string; display_name: string; profile_image_url: string }[];
  };
  const u = data.data?.[0];
  if (!u) throw new Error("Twitch-Antwort ohne User");
  return { id: u.id, login: u.login, name: u.display_name, avatar: u.profile_image_url };
}
```

- [ ] **Step 4: Auth-Routen in den Router einhängen**

In `src/worker/index.ts` die Imports erweitern und Handler ergänzen.

Import-Zeilen (ersetzen die bisherige session-Import-Zeile):

```ts
import {
  clearSessionCookie,
  createSession,
  getCookie,
  sessionCookie,
  verifySession,
  type SessionUser,
} from "./session";
import { exchangeCode, fetchUser } from "./twitch";
```

Neue Handler (oberhalb von `export default` einfügen):

```ts
const STATE_COOKIE = (v: string, maxAge: number) =>
  `floss_oauth_state=${v}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;

function authLogin(url: URL, env: Env): Response {
  const state = crypto.randomUUID();
  const target = new URL("https://id.twitch.tv/oauth2/authorize");
  target.searchParams.set("client_id", env.TWITCH_CLIENT_ID);
  target.searchParams.set("redirect_uri", `${url.origin}/auth/callback`);
  target.searchParams.set("response_type", "code");
  target.searchParams.set("state", state);
  return new Response(null, {
    status: 302,
    headers: { location: target.toString(), "set-cookie": STATE_COOKIE(state, 600) },
  });
}

async function authCallback(req: Request, url: URL, env: Env): Promise<Response> {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = getCookie(req.headers.get("cookie"), "floss_oauth_state");
  if (!code || !state || state !== cookieState) {
    return new Response("Login fehlgeschlagen — bitte nochmal von vorn.", { status: 400 });
  }
  const token = await exchangeCode(
    code,
    env.TWITCH_CLIENT_ID,
    env.TWITCH_CLIENT_SECRET,
    `${url.origin}/auth/callback`,
  );
  const user = await fetchUser(token, env.TWITCH_CLIENT_ID);
  const headers = new Headers({ location: "/" });
  headers.append("set-cookie", sessionCookie(await createSession(user, env.SESSION_SECRET)));
  headers.append("set-cookie", STATE_COOKIE("", 0));
  return new Response(null, { status: 302, headers });
}

async function authMe(req: Request, env: Env): Promise<Response> {
  return json({ user: await sessionUser(req, env) });
}

function authLogout(): Response {
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
}
```

Im `fetch`-Handler die Routen-Tabelle erweitern (vor den `/api/scores`-Zeilen):

```ts
      if (url.pathname === "/auth/login" && req.method === "GET") return authLogin(url, env);
      if (url.pathname === "/auth/callback" && req.method === "GET") return authCallback(req, url, env);
      if (url.pathname === "/auth/me" && req.method === "GET") return authMe(req, env);
      if (url.pathname === "/auth/logout" && req.method === "POST") return authLogout();
```

- [ ] **Step 5: Tests grün**

Run: `npm test` → Expected: alle Tests PASS.
Run: `npm run typecheck` → Expected: keine Fehler.

- [ ] **Step 6: Commit**

```powershell
git add src/worker/twitch.ts src/worker/index.ts test/auth.spec.ts && git commit -m @'
🟣 Twitch-OAuth: /auth/login, /auth/callback, /auth/me, /auth/logout

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 6: Frontend — Login-Zone, Bestenliste, Endscreen-Submit

**Files:**
- Create: `src/leaderboard.ts`
- Modify: `public/index.html`, `public/style.css`, `src/main.ts`, `src/sim.ts:1001-1004`
- Test: manuell über `npm run dev` (das Projekt hat keine DOM-Tests) + `npm run typecheck` + `npm run lint`

**Interfaces:**
- Consumes: `GET /auth/me`, `POST /auth/logout`, `GET/POST /api/scores` (Tasks 4+5); `$` aus `src/config.ts`; `settings.endless` aus `src/state.ts`.
- Produces: `initAccount(): Promise<void>`, `refreshBoard(): Promise<void>`, `reportRun(mode: "classic" | "endless", value: number): Promise<void>` aus `src/leaderboard.ts`.

- [ ] **Step 1: HTML erweitern**

`public/index.html` — drei Änderungen:

1. In `<header class="hero">` nach dem `<div>` mit `<h1>` (vor `</header>`) einfügen:

```html
        <div id="login-zone" class="login-zone"></div>
```

2. Nach `</section>` der Werkbank (Zeile mit `</section>` nach dem start-btn), vor `</div>` von `#build-screen`, einfügen:

```html
      <section class="board-card">
        <h2>🏆 Bestenliste <span id="board-mode-label" class="hint"></span></h2>
        <ol id="board-list" class="board-list"></ol>
      </section>
```

3. Im Endscreen zwischen `</div>` von `.end-score` und dem `retry-btn` einfügen:

```html
        <div id="end-board" class="end-board"></div>
```

- [ ] **Step 2: Leaderboard-Modul schreiben**

`src/leaderboard.ts`:

```ts
/* Twitch-Login-Zone + Bestenliste (Top 10 je Modus, eigener Rang). */

import { $ } from "./config";
import { settings } from "./state";

export type Mode = "classic" | "endless";

interface Me {
  id: string;
  login: string;
  name: string;
  avatar: string;
}
interface BoardRow {
  rank: number;
  name: string;
  avatar: string;
  value: number;
  self: boolean;
}
interface Board {
  top: BoardRow[];
  me: { rank: number; value: number; total: number } | null;
}

let me: Me | null = null;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (mode: Mode, v: number) => (mode === "endless" ? `${v} m` : String(v));
const currentMode = (): Mode => (settings.endless ? "endless" : "classic");

const LOGIN_BTN = `<a class="twitch-btn" href="/auth/login">Mit Twitch anmelden</a>`;

export async function initAccount(): Promise<void> {
  try {
    const res = await fetch("/auth/me");
    me = ((await res.json()) as { user: Me | null }).user;
  } catch {
    me = null;
  }
  renderLoginZone();
}

function renderLoginZone(): void {
  const zone = $("login-zone");
  if (me) {
    zone.innerHTML =
      `<img class="login-avatar" src="${esc(me.avatar)}" alt="" />` +
      `<span class="login-name">${esc(me.name)}</span>` +
      `<button id="logout-btn" class="tool-btn">Abmelden</button>`;
    $("logout-btn").addEventListener("click", () => {
      void fetch("/auth/logout", { method: "POST" }).then(() => {
        me = null;
        renderLoginZone();
        void refreshBoard();
      });
    });
  } else {
    zone.innerHTML = LOGIN_BTN;
  }
}

function listHtml(board: Board, mode: Mode): string {
  if (!board.top.length) {
    return `<li class="board-empty">Noch keine Einträge — sei der Erste auf dem Wasser!</li>`;
  }
  return board.top
    .map(
      (r) =>
        `<li class="board-row${r.self ? " board-me" : ""}">` +
        `<span class="board-rank">${r.rank}.</span>` +
        (r.avatar ? `<img class="board-avatar" src="${esc(r.avatar)}" alt="" />` : `<span class="board-avatar"></span>`) +
        `<span class="board-name">${esc(r.name)}</span>` +
        `<b class="board-value">${fmt(mode, r.value)}</b></li>`,
    )
    .join("");
}

export async function refreshBoard(): Promise<void> {
  const mode = currentMode();
  $("board-mode-label").textContent = mode === "endless" ? "♾️ Endlos" : "🏁 600 m Klassik";
  try {
    const res = await fetch(`/api/scores?mode=${mode}`);
    if (!res.ok) throw new Error(String(res.status));
    $("board-list").innerHTML = listHtml((await res.json()) as Board, mode);
  } catch {
    $("board-list").innerHTML = `<li class="board-empty">Bestenliste gerade nicht erreichbar. 🌊</li>`;
  }
}

/* Nach einem Lauf: Score einreichen (falls eingeloggt) und im Endscreen anzeigen. */
export async function reportRun(mode: Mode, value: number): Promise<void> {
  const box = $("end-board");
  if (!me) {
    box.innerHTML =
      LOGIN_BTN + `<p class="board-hint">…und beim nächsten Lauf in die Bestenliste einziehen.</p>`;
    return;
  }
  try {
    let board: Board;
    if (value > 0) {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, value }),
      });
      board = res.ok
        ? ((await res.json()) as Board)
        : ((await (await fetch(`/api/scores?mode=${mode}`)).json()) as Board);
    } else {
      board = (await (await fetch(`/api/scores?mode=${mode}`)).json()) as Board;
    }
    const placement = board.me
      ? `<p class="board-hint">Platz ${board.me.rank} von ${board.me.total} — dein Bestwert: ${fmt(mode, board.me.value)}</p>`
      : "";
    box.innerHTML = `<h3>🏆 Bestenliste</h3><ol class="board-list">${listHtml(board, mode)}</ol>${placement}`;
    void refreshBoard();
  } catch {
    box.innerHTML = "";
  }
}
```

- [ ] **Step 3: main.ts verdrahten**

In `src/main.ts`:

Import ergänzen:

```ts
import { initAccount, refreshBoard } from "./leaderboard";
```

Im `else`-Zweig (Spielseite) nach `renderBuild();` einfügen:

```ts
  void initAccount();
  void refreshBoard();
```

In `setMode` als letzte Zeile einfügen:

```ts
    void refreshBoard();
```

- [ ] **Step 4: sim.ts — Submit am Ende des Laufs**

In `src/sim.ts` oben bei den Imports ergänzen:

```ts
import { reportRun } from "./leaderboard";
```

In `endTest`, direkt vor `$("end-screen").classList.remove("hidden");` einfügen:

```ts
  $("end-board").innerHTML = "";
  void reportRun(endless ? "endless" : "classic", endless ? meters : score);
```

- [ ] **Step 5: CSS ergänzen**

Ans Ende von `public/style.css` anhängen:

```css
/* ---------- Twitch-Login + Bestenliste ---------- */

.login-zone {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.twitch-btn {
  display: inline-block;
  background: #9146ff;
  color: #fff;
  font-weight: 800;
  padding: 10px 16px;
  border-radius: 10px;
  text-decoration: none;
  box-shadow: 0 4px 16px rgba(145, 70, 255, 0.4);
}

.twitch-btn:hover {
  background: #7c2df0;
}

.login-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #9146ff;
}

.login-name {
  font-weight: 700;
}

.board-card {
  background: linear-gradient(180deg, #151c33, #10152a);
  border-radius: 16px;
  padding: 20px;
  margin-top: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}

.board-list {
  list-style: none;
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.board-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(180deg, #202946, #181f38);
  border: 1px solid #2a3455;
  border-radius: 10px;
  padding: 6px 12px;
}

.board-row.board-me {
  border-color: #9146ff;
  box-shadow: 0 0 12px rgba(145, 70, 255, 0.35);
}

.board-rank {
  width: 28px;
  text-align: right;
  font-weight: 800;
  color: var(--muted);
}

.board-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #2a3455;
}

.board-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.board-value {
  font-variant-numeric: tabular-nums;
}

.board-empty,
.board-hint {
  color: var(--muted);
  font-size: 0.85rem;
  padding: 6px 0;
}

.end-board {
  margin: 14px 0;
  text-align: left;
}

.end-board .twitch-btn {
  display: block;
  text-align: center;
}
```

- [ ] **Step 6: Bauen, prüfen, manuell testen**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: keine Fehler, `public/game.js` neu erzeugt.

Run: `npx wrangler dev --port 8787` (im Hintergrund), dann prüfen:

```powershell
curl.exe -s http://localhost:8787/auth/me            # → {"user":null}
curl.exe -s "http://localhost:8787/api/scores?mode=classic"  # → {"top":[],"me":null}
curl.exe -sI http://localhost:8787/                  # → 200, HTML
```

Im Browser `http://localhost:8787`: Login-Button sichtbar, Bestenliste zeigt „Noch keine Einträge", Modus-Switch wechselt das Label, nach einem Lauf zeigt der Endscreen den Gast-Hinweis mit Login-Button. (Der echte Twitch-Login geht lokal erst mit echten Secrets in `.dev.vars` — der volle Flow wird in Task 7 in Prod verifiziert.)

- [ ] **Step 7: Commit**

```powershell
git add -A && git commit -m @'
🖥️ Frontend: Twitch-Login-Zone, Bestenliste auf Start- und Endscreen

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 7: Deployment — Secrets, Migration, Twitch-App, Smoke-Test

**Files:**
- Modify: `wrangler.jsonc` (echte `TWITCH_CLIENT_ID`)

**Interfaces:**
- Consumes: alles aus Tasks 1–6.
- Produces: laufendes Feature unter `https://floss-simulator.brudigames.app`.

- [ ] **Step 1: Client-ID vom Nutzer erfragen und eintragen**

Den Nutzer nach der Twitch-Client-ID fragen (die ist nicht geheim) und in `wrangler.jsonc` unter `vars.TWITCH_CLIENT_ID` eintragen. Gleichzeitig daran erinnern, in der Twitch-App (dev.twitch.tv → deine App → OAuth Redirect URLs) BEIDE URLs einzutragen:
- `https://floss-simulator.brudigames.app/auth/callback`
- `http://localhost:8787/auth/callback`

- [ ] **Step 2: Secrets setzen**

`TWITCH_CLIENT_SECRET` muss der Nutzer selbst eingeben (wir dürfen es nie sehen). Ihm sagen, er soll im Chat eingeben:

```
! npx wrangler secret put TWITCH_CLIENT_SECRET
```

`SESSION_SECRET` generieren wir selbst und setzen es per Pipe (ohne es zu loggen):

```powershell
$s = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 })); $s | npx wrangler secret put SESSION_SECRET; $s = $null
```

Expected: beide Male „Success! Uploaded secret".

- [ ] **Step 3: Migration remote anwenden**

```powershell
npx wrangler d1 migrations apply brudivoeller --remote
```

Expected: `0001_floss_scores.sql` applied.

- [ ] **Step 4: Deploy**

```powershell
npm run deploy
```

Expected: Deploy ohne Fehler, Trigger `floss-simulator.brudigames.app (custom domain)`.

- [ ] **Step 5: Smoke-Test Prod**

```powershell
curl.exe -s https://floss-simulator.brudigames.app/auth/me
curl.exe -s "https://floss-simulator.brudigames.app/api/scores?mode=endless"
curl.exe -sI https://floss-simulator.brudigames.app/auth/login
```

Expected: `{"user":null}` · `{"top":[],"me":null}` · `HTTP 302` mit `location: https://id.twitch.tv/oauth2/authorize?...`.

Danach den Nutzer bitten, den echten Login im Browser durchzuklicken und einen Lauf zu spielen (Ende-zu-Ende-Verifikation: Name erscheint in der Bestenliste).

- [ ] **Step 6: Commit**

```powershell
git add wrangler.jsonc && git commit -m @'
🚀 Live: Twitch-Login + Bestenliste auf floss-simulator.brudigames.app

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

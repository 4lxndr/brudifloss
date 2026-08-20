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

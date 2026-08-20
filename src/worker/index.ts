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

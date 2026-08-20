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

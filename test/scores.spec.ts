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

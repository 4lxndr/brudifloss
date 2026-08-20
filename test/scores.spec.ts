import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { validateScore, submitRun, getBoard, KEEP_RUNS } from "../src/worker/scores";
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

describe("submitRun", () => {
  it("speichert jeden Lauf einzeln", async () => {
    await submitRun(env.DB, brudi, "classic", 500);
    await submitRun(env.DB, brudi, "classic", 300);
    const board = await getBoard(env.DB, "classic", brudi.id);
    expect(board.top.map((r) => r.value)).toEqual([500, 300]);
    expect(board.top.every((r) => r.self)).toBe(true);
    expect(board.me).toEqual({ rank: 1, value: 500, total: 2 });
  });

  it("behält nur die besten 5 Läufe je Spieler und Modus", async () => {
    for (const v of [100, 200, 300, 400, 500, 600]) await submitRun(env.DB, brudi, "classic", v);
    const board = await getBoard(env.DB, "classic", brudi.id);
    expect(board.top.map((r) => r.value)).toEqual([600, 500, 400, 300, 200]);
    expect(board.me?.total).toBe(KEEP_RUNS);
  });

  it("ein schlechterer Lauf als der 5.-beste fliegt sofort wieder raus", async () => {
    for (const v of [600, 500, 400, 300, 200]) await submitRun(env.DB, brudi, "classic", v);
    await submitRun(env.DB, brudi, "classic", 100);
    const board = await getBoard(env.DB, "classic", brudi.id);
    expect(board.top.map((r) => r.value)).toEqual([600, 500, 400, 300, 200]);
  });

  it("Wertgleichheit an der 5er-Grenze: es bleiben exakt 5 Läufe", async () => {
    for (const v of [500, 400, 300, 200, 100]) await submitRun(env.DB, brudi, "classic", v);
    await submitRun(env.DB, brudi, "classic", 100); // gleicher Wert wie der 5.-beste
    const board = await getBoard(env.DB, "classic", brudi.id);
    expect(board.top.map((r) => r.value)).toEqual([500, 400, 300, 200, 100]);
    expect(board.me?.total).toBe(KEEP_RUNS);
  });

  it("aktualisiert Name/Avatar auf allen Zeilen", async () => {
    await submitRun(env.DB, brudi, "classic", 500);
    await submitRun(env.DB, { ...brudi, name: "NeuerName", avatar: "a2" }, "classic", 100);
    const board = await getBoard(env.DB, "classic");
    expect(board.top.map((r) => r.name)).toEqual(["NeuerName", "NeuerName"]);
    expect(board.top[0].avatar).toBe("a2");
  });

  it("Modi sind getrennt", async () => {
    await submitRun(env.DB, brudi, "classic", 500);
    await submitRun(env.DB, brudi, "endless", 777);
    expect((await getBoard(env.DB, "classic")).top.map((r) => r.value)).toEqual([500]);
    expect((await getBoard(env.DB, "endless")).top.map((r) => r.value)).toEqual([777]);
  });
});

describe("getBoard", () => {
  it("Top 10 absteigend, Spieler darf mehrfach auftauchen", async () => {
    for (const v of [900, 800, 700]) await submitRun(env.DB, brudi, "classic", v);
    await submitRun(env.DB, gast(1), "classic", 850);
    const board = await getBoard(env.DB, "classic", brudi.id);
    expect(board.top.map((r) => r.value)).toEqual([900, 850, 800, 700]);
    expect(board.top.map((r) => r.self)).toEqual([true, false, true, true]);
  });

  it("Rang außerhalb der Top 10, total zählt Läufe", async () => {
    for (let i = 1; i <= 12; i++) await submitRun(env.DB, gast(i), "classic", i * 100);
    await submitRun(env.DB, brudi, "classic", 50);
    const board = await getBoard(env.DB, "classic", brudi.id);
    expect(board.top).toHaveLength(10);
    expect(board.top[0].value).toBe(1200);
    expect(board.me).toEqual({ rank: 13, value: 50, total: 13 });
  });

  it("leer + ohne Login", async () => {
    const board = await getBoard(env.DB, "classic");
    expect(board).toEqual({ top: [], me: null });
  });
});

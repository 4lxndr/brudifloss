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

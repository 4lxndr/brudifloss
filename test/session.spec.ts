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

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

  it("Fehler beim Token-Tausch wird zu sauberem 500", async () => {
    fetchMock
      .get("https://id.twitch.tv")
      .intercept({ method: "POST", path: "/oauth2/token" })
      .reply(500, "kaputt");
    const res = await SELF.fetch("https://x/auth/callback?code=c&state=s2", {
      redirect: "manual",
      headers: { cookie: "floss_oauth_state=s2" },
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "server_error" });
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

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

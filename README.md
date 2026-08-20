# 🛶 FLOẞ-SIMULATOR – Brudivoeller_TV Edition

> Baue ein Floß aus Gerümpel. Schau zu, wie es die Physik, ein Felsen, die Wasserschutzpolizei oder eine taktische Atombombe zerlegt. Topfi überlebt. Topfi überlebt immer.

Ein hochseriöses Ingenieurs-Tool, mit dem ein 85 kg schwerer Streamer, der nicht schwimmen
kann (angeblich), aus Gummienten, Bierkästen, einem Apfelstrudel und einem emotional stabilen
Topf namens **Topfi** ein Floß zusammensteckt — um damit **600 m Wildwasser** zu überstehen.

Die Wahrscheinlichkeit, dass das gut geht, wurde von unabhängigen Experten mit „lol“ beziffert.

## Features, auf die niemand gewartet hat

- 🔨 **Werkbank-Editor:** Teile zusammenstecken auf einem 20×10-Raster. Was sich nicht berührt, gehört nicht zusammen. Was sich berührt, hält trotzdem nicht.
- 🌊 **Echte™ Physik:** Auftrieb pro Zelle, Schwerpunkt, Kentern, Wellen. Ungefähr so genau wie eine Bierdeckelrechnung, aber mit mehr Emotionen.
- 🪨 **Felsen:** Stehen einfach da. Schon immer. Dein Floß verliert Teile, die Felsen verlieren nichts.
- 🚔 **Wasserschutzpolizei:** Kommt zufällig vorbei, fragt nach der Zulassung und schießt dann mit der Bordkanone. Es gibt keine Zulassung. Es gab nie eine.
- 🚀 **Raketen:** Große Flöße ziehen militärische Aufmerksamkeit auf sich. Ist so. Der „Zielscheiben-Faktor“ warnt dich beim Bauen.
- ☢️ **Atombombe:** Ab 10 Topfis wird nicht mehr verhandelt. DEFCON 1. Die Topfis überleben den Einschlag. Alle. Selbstverständlich.
- 🍲 **Topfi:** Der treueste Topf der Welt. Unzerstörbar. Verlässt Brudi nie. Wird vom Militär beobachtet.
- 🥧 **Apfelstrudel:** Tragendes Bauteil UND Proviant. Wird zu 50 % mitten auf dem Fluss gegessen. Es ist es jedes Mal wert.

## Tech (der langweilige Teil)

- TypeScript → esbuild → javascript-obfuscator → Cloudflare Workers (Static Assets + Fetch-Handler)
- Highscores in Cloudflare D1 (Datenbank `brudivoeller`, Tabelle `floss_scores`) — bester Lauf je Spieler, je Modus
- Login via Twitch OAuth, Session als HMAC-signiertes HttpOnly-Cookie. Gäste dürfen trotzdem ertrinken, nur eben anonym.
- `npm run build` — bauen · `npm run deploy` — bauen + deployen · `npm run typecheck` — Gewissen beruhigen · `npm test` — Worker-Tests (Vitest + Miniflare)
- Immer noch keine Zulassung.

## Setup (einmalig, für den Betrieb)

Es gibt eine [Twitch-App](https://dev.twitch.tv/console/apps) mit diesen OAuth-Redirect-URLs:

- `https://floss-simulator.brudigames.app/auth/callback`
- `http://localhost:8787/auth/callback` (lokale Entwicklung)

Die Client-ID steht öffentlich in `wrangler.jsonc` unter `vars.TWITCH_CLIENT_ID`.
Die Geheimnisse leben als Worker-Secrets und werden interaktiv gesetzt (nie committen,
nie in die Shell-History tippen):

```sh
npx wrangler secret put TWITCH_CLIENT_SECRET   # das Secret der Twitch-App
npx wrangler secret put SESSION_SECRET         # beliebiger langer Zufallsstring (signiert die Session-Cookies)
```

Wrangler fragt nach dem Wert — einfach reinpasten, Enter, fertig. `wrangler secret list`
zeigt, was gesetzt ist (nur Namen, nie Werte). Wird `SESSION_SECRET` rotiert, sind alle
ausgeloggt — die Highscores bleiben.

Für lokale Entwicklung die gleichen zwei Namen in eine `.dev.vars` legen (ist gitignored):

```
TWITCH_CLIENT_SECRET=…
SESSION_SECRET=irgendwas-langes-lokales
```

Datenbank-Migrationen: `npx wrangler d1 migrations apply brudivoeller --local` für den
Dev-Server, mit `--remote` statt `--local` für Produktion.

## Credits

Sämtliche Grafiken sind von Hand auf den Canvas gezeichnet — inklusive des
leicht schimmeligen Topfs. Keine Sprite-Packs, keine Emojis (fast), kein Stil-Mix.

## Lizenz

[WTFPL](LICENSE) — Do What The Fuck You Want To Public License. Die Lizenzbedingungen
bestehen aus einem einzigen Paragraphen und er hält, was er verspricht.

## Disclaimer

Kein echtes Floß wurde für dieses Projekt zugelassen. Der TÜV wurde nicht gefragt und
möchte auch weiterhin nicht gefragt werden. Bei Verlust von Kanalpunkten, Würde oder
Apfelstrudel übernehmen wir keine Haftung. Topfi ist ein eingetragenes Gefühl.

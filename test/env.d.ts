declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    TEST_MIGRATIONS: D1Migration[];
    TWITCH_CLIENT_ID: string;
    TWITCH_CLIENT_SECRET: string;
    SESSION_SECRET: string;
  }
}

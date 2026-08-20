/* Highscore-Zugriff auf D1: ein Eintrag je Spieler und Modus, nur Bestwert zählt. */

import type { SessionUser } from "./session";

export type Mode = "classic" | "endless";

export const CAPS: Record<Mode, number> = { classic: 10_000, endless: 50_000 };

export interface BoardRow {
  rank: number;
  name: string;
  avatar: string;
  value: number;
  self: boolean;
}

export interface Board {
  top: BoardRow[];
  me: { rank: number; value: number; total: number } | null;
}

export function parseMode(m: unknown): Mode | null {
  return m === "classic" || m === "endless" ? m : null;
}

export function validateScore(mode: unknown, value: unknown): { mode: Mode; value: number } | null {
  const m = parseMode(mode);
  if (!m) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0 || value > CAPS[m]) {
    return null;
  }
  return { mode: m, value };
}

export async function upsertScore(
  db: D1Database,
  user: SessionUser,
  mode: Mode,
  value: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO floss_scores (twitch_id, mode, value, display_name, avatar_url, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT (twitch_id, mode) DO UPDATE SET
         value = MAX(floss_scores.value, excluded.value),
         display_name = excluded.display_name,
         avatar_url = excluded.avatar_url,
         updated_at = CASE
           WHEN excluded.value > floss_scores.value THEN excluded.updated_at
           ELSE floss_scores.updated_at
         END`,
    )
    .bind(user.id, mode, value, user.name, user.avatar, new Date().toISOString())
    .run();
}

export async function getBoard(db: D1Database, mode: Mode, twitchId?: string): Promise<Board> {
  const { results } = await db
    .prepare(
      `SELECT twitch_id, display_name, avatar_url, value
       FROM floss_scores WHERE mode = ?1
       ORDER BY value DESC, updated_at ASC LIMIT 10`,
    )
    .bind(mode)
    .all<{ twitch_id: string; display_name: string; avatar_url: string; value: number }>();

  const top: BoardRow[] = results.map((r, i) => ({
    rank: i + 1,
    name: r.display_name,
    avatar: r.avatar_url,
    value: r.value,
    self: twitchId !== undefined && r.twitch_id === twitchId,
  }));

  let me: Board["me"] = null;
  if (twitchId !== undefined) {
    const mine = await db
      .prepare(`SELECT value FROM floss_scores WHERE mode = ?1 AND twitch_id = ?2`)
      .bind(mode, twitchId)
      .first<{ value: number }>();
    if (mine) {
      const stats = await db
        .prepare(
          `SELECT COUNT(*) AS total,
                  SUM(CASE WHEN value > ?2 THEN 1 ELSE 0 END) AS better
           FROM floss_scores WHERE mode = ?1`,
        )
        .bind(mode, mine.value)
        .first<{ total: number; better: number }>();
      me = { rank: (stats?.better ?? 0) + 1, value: mine.value, total: stats?.total ?? 0 };
    }
  }
  return { top, me };
}

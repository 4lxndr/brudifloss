/* Highscore-Zugriff auf D1: jeder Lauf zählt einzeln, pro Spieler und Modus
   bleiben die besten 5 Läufe gespeichert. */

import type { SessionUser } from "./session";

export type Mode = "classic" | "endless";

export const CAPS: Record<Mode, number> = { classic: 10_000, endless: 50_000 };
export const KEEP_RUNS = 5;

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

export async function submitRun(
  db: D1Database,
  user: SessionUser,
  mode: Mode,
  value: number,
): Promise<void> {
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT INTO floss_scores (twitch_id, mode, value, display_name, avatar_url, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      )
      .bind(user.id, mode, value, user.name, user.avatar, now),
    db
      .prepare(`UPDATE floss_scores SET display_name = ?2, avatar_url = ?3 WHERE twitch_id = ?1`)
      .bind(user.id, user.name, user.avatar),
    db
      .prepare(
        `DELETE FROM floss_scores
         WHERE twitch_id = ?1 AND mode = ?2 AND id NOT IN (
           SELECT id FROM floss_scores
           WHERE twitch_id = ?1 AND mode = ?2
           ORDER BY value DESC, created_at ASC, id ASC
           LIMIT ${KEEP_RUNS}
         )`,
      )
      .bind(user.id, mode),
  ]);
}

export async function getBoard(db: D1Database, mode: Mode, twitchId?: string): Promise<Board> {
  const { results } = await db
    .prepare(
      `SELECT twitch_id, display_name, avatar_url, value
       FROM floss_scores WHERE mode = ?1
       ORDER BY value DESC, created_at ASC, id ASC LIMIT 10`,
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
    const best = await db
      .prepare(`SELECT MAX(value) AS value FROM floss_scores WHERE mode = ?1 AND twitch_id = ?2`)
      .bind(mode, twitchId)
      .first<{ value: number | null }>();
    if (best && best.value !== null) {
      const stats = await db
        .prepare(
          `SELECT COUNT(*) AS total, SUM(CASE WHEN value > ?2 THEN 1 ELSE 0 END) AS better
           FROM floss_scores WHERE mode = ?1`,
        )
        .bind(mode, best.value)
        .first<{ total: number; better: number | null }>();
      me = { rank: (stats?.better ?? 0) + 1, value: best.value, total: stats?.total ?? 0 };
    }
  }
  return { top, me };
}

-- Umbau: jeder Lauf eine eigene Zeile; pro Spieler+Modus bleiben die besten 5.
-- Die alte Tabelle war zum Zeitpunkt der Migration leer (frisch gelauncht).
DROP TABLE IF EXISTS floss_scores;

CREATE TABLE floss_scores (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  twitch_id    TEXT NOT NULL,
  mode         TEXT NOT NULL CHECK (mode IN ('classic', 'endless')),
  value        INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url   TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL
);

CREATE INDEX floss_scores_mode_value ON floss_scores (mode, value DESC);
CREATE INDEX floss_scores_player ON floss_scores (twitch_id, mode, value DESC);

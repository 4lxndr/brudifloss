-- Bestenliste des Floß-Simulators. DB "brudivoeller" wird von mehreren
-- Brudi-Games geteilt, daher das Tabellen-Präfix "floss_".
CREATE TABLE IF NOT EXISTS floss_scores (
  twitch_id    TEXT NOT NULL,
  mode         TEXT NOT NULL CHECK (mode IN ('classic', 'endless')),
  value        INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url   TEXT NOT NULL DEFAULT '',
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (twitch_id, mode)
);

CREATE INDEX IF NOT EXISTS floss_scores_mode_value
  ON floss_scores (mode, value DESC);

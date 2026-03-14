-- Dodanie tabeli match_bans do bazy danych
-- Ta tabela przechowuje informacje o graczach zbanowanych z konkretnego meczu

CREATE TABLE IF NOT EXISTS match_bans (
  id BIGSERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_id, user_id)
);

-- Indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_match_bans_match_id ON match_bans(match_id);
CREATE INDEX IF NOT EXISTS idx_match_bans_user_id ON match_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_match_bans_match_user ON match_bans(match_id, user_id);

-- Schema dla Neon Postgres
-- Tabela użytkowników
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  phone VARCHAR(50),
  preferred_level VARCHAR(50),
  is_admin INTEGER DEFAULT 0,
  is_superuser INTEGER DEFAULT 0,
  username VARCHAR(255),
  can_create_matches INTEGER DEFAULT 1,
  can_register_to_matches INTEGER DEFAULT 1,
  oauth_provider VARCHAR(50),
  oauth_id VARCHAR(255),
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(oauth_provider, oauth_id)
);

-- Tabela meczów
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  date_start TIMESTAMP NOT NULL,
  date_end TIMESTAMP NOT NULL,
  location VARCHAR(500) NOT NULL,
  max_players INTEGER NOT NULL,
  organizer_phone VARCHAR(50),
  organizer_email VARCHAR(255),
  payment_methods JSONB,
  status VARCHAR(20) DEFAULT 'active',
  level VARCHAR(50) DEFAULT 'kopanina',
  is_recurring INTEGER DEFAULT 0,
  recurrence_frequency VARCHAR(20),
  registration_start TIMESTAMP,
  registration_end TIMESTAMP,
  entry_fee VARCHAR(100),
  is_free INTEGER DEFAULT 0,
  is_private INTEGER DEFAULT 0,
  private_token VARCHAR(64) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela rejestracji
CREATE TABLE IF NOT EXISTS registrations (
  id BIGSERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_waitlist INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_id, user_id)
);

-- Tabela banów (gracz zbanowany z konkretnego meczu)
CREATE TABLE IF NOT EXISTS match_bans (
  id BIGSERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_id, user_id)
);

-- Indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_date_start ON matches(date_start);
CREATE INDEX IF NOT EXISTS idx_registrations_match_id ON registrations(match_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_match_user ON registrations(match_id, user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_waitlist ON registrations(match_id, is_waitlist) WHERE is_waitlist = 1;
CREATE INDEX IF NOT EXISTS idx_matches_private_token ON matches(private_token) WHERE private_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_match_bans_match_id ON match_bans(match_id);
CREATE INDEX IF NOT EXISTS idx_match_bans_user_id ON match_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_match_bans_match_user ON match_bans(match_id, user_id);


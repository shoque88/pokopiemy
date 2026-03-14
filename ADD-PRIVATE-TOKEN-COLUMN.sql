-- Dodanie kolumny private_token do tabeli matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS private_token VARCHAR(64) UNIQUE;

-- Utworzenie indeksu dla szybszego wyszukiwania po tokenie
CREATE INDEX IF NOT EXISTS idx_matches_private_token ON matches(private_token) WHERE private_token IS NOT NULL;

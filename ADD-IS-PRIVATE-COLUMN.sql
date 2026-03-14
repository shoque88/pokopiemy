-- Dodanie kolumny is_private do tabeli matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_private INTEGER DEFAULT 0;

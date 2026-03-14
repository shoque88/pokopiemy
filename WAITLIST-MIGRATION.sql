-- Migracja: Dodanie listy rezerwowej do rejestracji
-- Wykonaj to zapytanie w Neon Dashboard SQL Editor

-- Dodaj kolumnę is_waitlist do tabeli registrations
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS is_waitlist INTEGER DEFAULT 0;

-- Dodaj indeks dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_registrations_waitlist ON registrations(match_id, is_waitlist) WHERE is_waitlist = 1;

-- Ustaw istniejące rejestracje jako normalne (nie na liście rezerwowej)
UPDATE registrations SET is_waitlist = 0 WHERE is_waitlist IS NULL;




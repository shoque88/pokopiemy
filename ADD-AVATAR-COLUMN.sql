-- Migracja: Dodanie kolumny avatar do tabeli users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar VARCHAR(500);


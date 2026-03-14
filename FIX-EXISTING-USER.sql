-- Napraw istniejących użytkowników - ustaw can_create_matches i can_register_to_matches na 1
-- Wykonaj to zapytanie w Neon Dashboard SQL Editor

UPDATE users 
SET can_create_matches = 1, can_register_to_matches = 1 
WHERE can_create_matches = 0 OR can_register_to_matches = 0;




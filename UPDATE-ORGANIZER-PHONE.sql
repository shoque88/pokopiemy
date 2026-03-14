-- Migracja: Aktualizacja numerów telefonów organizatorów w istniejących meczach
-- Ten skrypt aktualizuje organizer_phone w meczach, jeśli organizator ma telefon w profilu,
-- a mecz ma tylko email lub ma pusty/null telefon

-- Aktualizuj mecze, gdzie organizer_phone jest NULL lub pusty, a organizer_email jest wypełniony
-- i organizator ma telefon w profilu
UPDATE matches
SET organizer_phone = (
    SELECT phone 
    FROM users 
    WHERE users.email = matches.organizer_email 
      AND users.phone IS NOT NULL 
      AND users.phone != ''
    LIMIT 1
)
WHERE (organizer_phone IS NULL OR organizer_phone = '')
  AND organizer_email IS NOT NULL
  AND organizer_email != ''
  AND EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.email = matches.organizer_email 
      AND users.phone IS NOT NULL 
      AND users.phone != ''
  );

-- Aktualizuj również mecze, gdzie organizer_phone jest już wypełniony, ale organizator ma nowy telefon w profilu
-- (tylko jeśli organizer_phone w meczu nie pasuje do telefonu w profilu)
UPDATE matches
SET organizer_phone = (
    SELECT phone 
    FROM users 
    WHERE users.email = matches.organizer_email 
      AND users.phone IS NOT NULL 
      AND users.phone != ''
      AND users.phone != matches.organizer_phone
    LIMIT 1
)
WHERE organizer_email IS NOT NULL
  AND organizer_email != ''
  AND EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.email = matches.organizer_email 
      AND users.phone IS NOT NULL 
      AND users.phone != ''
      AND users.phone != matches.organizer_phone
  );

-- Sprawdź wyniki
SELECT 
    m.id,
    m.name,
    m.organizer_phone,
    m.organizer_email,
    u.phone as user_phone,
    u.email as user_email
FROM matches m
LEFT JOIN users u ON u.email = m.organizer_email
WHERE m.organizer_email IS NOT NULL
ORDER BY m.id;




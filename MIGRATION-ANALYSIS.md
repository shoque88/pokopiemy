# Analiza migracji z Vercel Blob Store

## Obecny problem
- Race conditions przy równoczesnych zapisach rejestracji
- Opóźnienia propagacji CDN powodują, że dane nie są natychmiast widoczne
- Brak transakcji/atomic operations w Blob Store

## Porównanie rozwiązań

### 1. Vercel Edge Config ❌
**Nie zalecane dla tej aplikacji**

**Zalety:**
- Ultra-szybki odczyt (< 1ms)
- Globalna propagacja danych

**Wady:**
- Zapis trwa **kilka sekund** na propagację globalną (gorsze niż Blob Store!)
- Zoptymalizowany do **rzadkich zapisów** (nasza aplikacja ma częste zapisy)
- Rate limits na zapisy
- Przeznaczony do danych konfiguracyjnych, nie danych aplikacyjnych

**Wniosek:** Edge Config byłby gorszy niż Blob Store dla tego przypadku użycia.

### 2. Vercel KV (Redis) ✅
**Dobre rozwiązanie**

**Zalety:**
- Atomic operations (INCR, SETNX, etc.)
- Bardzo szybkie zapisy i odczyty
- Lepsze wsparcie dla częstych zapisów
- Struktury danych (lists, sets, hashes)

**Wady:**
- Brak pełnych transakcji SQL
- Ograniczenia w złożonych zapytaniach
- Wymaga zmiany struktury danych

**Koszt:** ~$0.20/GB storage + $0.20/milion operacji

### 3. Vercel Postgres ✅✅
**Najlepsze rozwiązanie**

**Zalety:**
- **Pełne transakcje ACID** - rozwiązuje problemy z race conditions
- SQL queries - łatwiejsze złożone zapytania
- Relacje między tabelami (foreign keys)
- Migracje schematu
- Backup i restore
- Lepsze dla danych aplikacyjnych

**Wady:**
- Wymaga większej refaktoryzacji kodu
- Nieco wolniejszy niż KV dla prostych operacji

**Koszt:** Darmowy tier (256MB storage, 60h compute/month) lub od $20/miesiąc

## Rekomendacja

**Vercel Postgres** jest najlepszym rozwiązaniem, ponieważ:
1. Transakcje rozwiązują problemy z race conditions
2. Lepsze dla danych aplikacyjnych (użytkownicy, mecze, rejestracje)
3. Relacje między tabelami zapewniają spójność danych
4. Darmowy tier wystarczy na start

## Plan migracji do Vercel Postgres

### Krok 1: Utworzenie bazy danych
1. W Vercel Dashboard → Storage → Create Database → Postgres
2. Skopiuj connection string

### Krok 2: Instalacja zależności
```bash
npm install @vercel/postgres
```

### Krok 3: Migracja schematu
Utworzenie tabel:
- `users` (id, name, email, password, oauth_provider, oauth_id, ...)
- `matches` (id, name, date_start, date_end, location, ...)
- `registrations` (id, match_id, user_id, created_at)

### Krok 4: Refaktoryzacja `lib/db.ts`
- Zamiana `readCollection`/`writeCollection` na SQL queries
- Użycie transakcji dla operacji zapisu rejestracji
- Zachowanie istniejącego interfejsu API

### Krok 5: Migracja danych
- Eksport danych z Blob Store
- Import do Postgres

### Krok 6: Testy i wdrożenie
- Testy równoczesnych zapisów
- Weryfikacja spójności danych
- Wdrożenie produkcyjne

## Alternatywa: Pozostać przy Blob Store

Jeśli migracja do Postgres jest zbyt skomplikowana, możemy:
1. Dodać optimistic locking (sprawdzanie wersji przed zapisem)
2. Zwiększyć opóźnienia między retry
3. Dodać queue system dla zapisów rejestracji

Ale to nie rozwiąże problemu całkowicie - tylko zmniejszy prawdopodobieństwo konfliktów.




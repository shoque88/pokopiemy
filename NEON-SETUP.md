# Instrukcja konfiguracji Neon Postgres

## Krok 1: Instalacja zależności

```bash
npm install @neondatabase/serverless
```

## Krok 2: Konfiguracja w Neon Dashboard

1. Przejdź do: https://console.neon.tech/app/***REDACTED_ORG***/projects
2. Wybierz projekt (lub utwórz nowy)
3. Skopiuj connection string (Connection string)
   - Format: `postgres://user:password@host.neon.tech/dbname?sslmode=require`

## Krok 3: Utworzenie schematu bazy danych

### 3.1. Otwórz SQL Editor w Neon Dashboard

1. Przejdź do: https://console.neon.tech/app/***REDACTED_ORG***/projects
2. Kliknij na swój projekt (lub utwórz nowy, jeśli jeszcze go nie masz)
3. W lewym menu bocznym znajdź i kliknij **"SQL Editor"** (ikonka z symbolem `</>` lub tekst "SQL Editor")
4. Otworzy się edytor SQL w środkowej części ekranu

### 3.2. Przygotuj skrypt SQL

1. Otwórz plik `schema.sql` w edytorze kodu (w projekcie lokalnym)
2. **Skopiuj całą zawartość** pliku `schema.sql` (Ctrl+C / Cmd+C)
   - Plik zawiera definicje trzech tabel: `users`, `matches`, `registrations`
   - Zawiera również indeksy dla lepszej wydajności

### 3.3. Wklej i wykonaj SQL

1. W SQL Editor w Neon Dashboard **wklej skopiowany kod SQL** (Ctrl+V / Cmd+V)
2. Sprawdź czy kod wygląda poprawnie - powinien zawierać:
   - `CREATE TABLE IF NOT EXISTS users`
   - `CREATE TABLE IF NOT EXISTS matches`
   - `CREATE TABLE IF NOT EXISTS registrations`
   - Kilka `CREATE INDEX IF NOT EXISTS`
3. **Kliknij przycisk "Run"** lub naciśnij `Ctrl+Enter` / `Cmd+Enter`
4. Poczekaj na wykonanie (zwykle kilka sekund)

### 3.4. Weryfikacja utworzenia tabel

1. Po wykonaniu SQL powinieneś zobaczyć komunikat sukcesu (np. "Success" lub zielony checkmark)
2. Aby zweryfikować, że tabele zostały utworzone:
   - W lewym menu bocznym kliknij **"Tables"** lub **"Database"** → **"Tables"**
   - Powinieneś zobaczyć trzy tabele: `users`, `matches`, `registrations`
3. Alternatywnie, możesz uruchomić w SQL Editor:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
   Powinieneś zobaczyć listę z `matches`, `registrations`, `users`

### 3.5. Jeśli wystąpi błąd

- **Błąd "relation already exists"** - oznacza, że tabele już istnieją (możesz je zignorować lub usunąć przed ponownym wykonaniem)
- **Błąd składni SQL** - sprawdź czy skopiowałeś cały kod bez błędów
- **Błąd uprawnień** - upewnij się, że używasz właściwego użytkownika bazy danych

## Krok 4: Konfiguracja zmiennych środowiskowych

### Lokalnie (.env.local):
```bash
DATABASE_URL=postgres://user:password@host.neon.tech/dbname?sslmode=require
```

### W Vercel:
1. Przejdź do projektu w Vercel Dashboard
2. Settings → Environment Variables
3. Dodaj `DATABASE_URL` z connection string z Neona
4. Dodaj dla wszystkich środowisk (Production, Preview, Development)

## Krok 5: Migracja danych (opcjonalnie)

Jeśli masz dane w Blob Store, które chcesz zmigrować:
1. Eksport danych z Blob Store (JSON files)
2. Użyj skryptu migracji do importu danych do Postgres

## Krok 6: Weryfikacja

Uruchom aplikację lokalnie i sprawdź czy połączenie działa:
```bash
npm run dev
```

Sprawdź logi - powinny pokazywać połączenie z bazą danych.


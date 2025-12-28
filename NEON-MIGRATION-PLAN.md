# Plan migracji do Neon Postgres

## Dlaczego Neon Postgres?

✅ **Transakcje ACID** - rozwiązuje problemy z race conditions
✅ **Darmowy plan** - 20 projektów, 100h CU/projekt, 0.5GB storage/branch
✅ **Serwerless** - auto-scaling, idealny dla Vercel
✅ **Kompatybilność z Vercel** - łatwa integracja
✅ **Backup i restore** - automatyczne kopie zapasowe
✅ **Branching** - osobne bazy dla preview deployments

## Krok 1: Instalacja zależności

```bash
npm install @neondatabase/serverless
npm install -D drizzle-orm drizzle-kit
```

**Lub prostsze rozwiązanie z raw SQL:**
```bash
npm install @neondatabase/serverless
```

## Krok 2: Konfiguracja zmiennych środowiskowych

W Neon Dashboard:
1. Pobierz connection string (postgres://...)
2. Dodaj do `.env.local`:
```
DATABASE_URL=postgres://user:password@host.neon.tech/dbname?sslmode=require
```

W Vercel:
1. Settings → Environment Variables
2. Dodaj `DATABASE_URL` z connection string z Neona

## Krok 3: Schemat bazy danych

Utworzenie trzech tabel:
- `users` - użytkownicy
- `matches` - mecze
- `registrations` - rejestracje na mecze

## Krok 4: Migracja danych

- Eksport danych z Blob Store (JSON files)
- Import do Postgres (INSERT statements)

## Krok 5: Refaktoryzacja lib/db.ts

- Zamiana `readCollection`/`writeCollection` na SQL queries
- Użycie transakcji dla operacji zapisu rejestracji
- Zachowanie istniejącego interfejsu API

## Krok 6: Testy

- Testy równoczesnych zapisów
- Weryfikacja spójności danych
- Testy wydajności


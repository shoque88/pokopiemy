# Szybki przewodnik migracji do Neon Postgres

## Problem z Blob Store

Z logów widzę, że rejestracje są zapisywane, ale nie są widoczne natychmiast z powodu opóźnienia propagacji CDN w Vercel Blob. To jest fundamentalne ograniczenie Blob Store - nie da się tego całkowicie rozwiązać.

## Rozwiązanie: Migracja do Neon Postgres

Migracja do Neon Postgres rozwiąże wszystkie problemy z:
- ✅ Race conditions
- ✅ Opóźnieniami propagacji danych
- ✅ Concurrent writes

## Kroki migracji (5-10 minut)

### Krok 1: Sprawdź czy DATABASE_URL jest ustawione

W `.env.local` powinieneś mieć:
```bash
DATABASE_URL=postgres://user:password@host.neon.tech/dbname?sslmode=require
```

### Krok 2: Zmień importy w aplikacji

Znajdź wszystkie pliki, które importują `@/lib/db` i zmień na `@/lib/db-neon`:

**Pliki do zmiany:**
1. `lib/init.ts` - zmień `import { initDatabase } from './db'` na `import { initDatabase } from './db-neon'`
2. `lib/auth-options.ts` - zmień `import db from '@/lib/db'` na `import db from '@/lib/db-neon'`
3. `app/api/matches/route.ts` - zmień `import db from '@/lib/db'` na `import db from '@/lib/db-neon'`
4. `app/api/matches/[id]/route.ts` - zmień `import db from '@/lib/db'` na `import db from '@/lib/db-neon'`
5. `app/api/registrations/route.ts` - zmień `import db from '@/lib/db'` na `import db from '@/lib/db-neon'`
6. `app/api/registrations/[id]/route.ts` - zmień `import db from '@/lib/db'` na `import db from '@/lib/db-neon'`
7. `app/api/users/[id]/route.ts` - zmień `import db from '@/lib/db'` na `import db from '@/lib/db-neon'`
8. `lib/match-utils.ts` - zmień `import db from '@/lib/db'` na `import db from '@/lib/db-neon'`
9. `lib/auth-nextauth.ts` - zmień `import db from '@/lib/db'` na `import db from '@/lib/db-neon'`
10. Wszystkie inne pliki używające `@/lib/db`

### Krok 3: Usuń wykluczenie z tsconfig.json

W `tsconfig.json` usuń `lib/db-neon.ts` z `exclude`:
```json
"exclude": ["node_modules"]
```

### Krok 4: Dodaj DATABASE_URL w Vercel Dashboard

1. Przejdź do projektu w Vercel Dashboard
2. Settings → Environment Variables
3. Dodaj `DATABASE_URL` z connection string z Neona
4. Dodaj dla wszystkich środowisk (Production, Preview, Development)

### Krok 5: Przetestuj aplikację

```bash
npm run dev
```

Sprawdź czy:
- ✅ Aplikacja się uruchamia bez błędów
- ✅ Możesz się zalogować
- ✅ Możesz utworzyć mecz
- ✅ Możesz się zapisać na mecz
- ✅ Rejestracje są widoczne natychmiast

### Krok 6: (Opcjonalnie) Migracja danych z Blob Store

Jeśli masz ważne dane w Blob Store, które chcesz zmigrować, można to zrobić później. Na razie możesz zacząć z pustą bazą danych.


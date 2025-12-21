# Wdrożenie Pokopiemy przez IONOS Deploy Now

IONOS oferuje **Deploy Now** - platformę do automatycznego wdrażania aplikacji z GitHub. To najlepsze rozwiązanie dla IONOS Web Hosting Plus.

## ⚠️ WAŻNE: Ograniczenia Deploy Now

Deploy Now obsługuje tylko **statyczne eksporty** Next.js. Oznacza to:
- ❌ API routes **NIE będą działać**
- ❌ NextAuth.js **NIE będzie działać** (wymaga serwera)
- ❌ Zapisywanie danych do plików **NIE będzie działać**
- ✅ Frontend będzie działał
- ✅ Statyczne strony będą działały

## Rozwiązanie: Hybrydowe wdrożenie

Aby aplikacja działała w pełni, potrzebujesz:
1. **Frontend** na IONOS Deploy Now (statyczny)
2. **Backend API** na zewnętrznym serwisie (Vercel, Railway, Render)

---

## KROK 1: Przygotowanie aplikacji do Deploy Now

### 1.1. Zaktualizuj next.config.js dla statycznego exportu

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Eksportuj jako statyczną stronę
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true, // Wymagane dla statycznego exportu
  },
}

module.exports = nextConfig
```

### 1.2. Utwórz repozytorium GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Utwórz repozytorium na GitHub, następnie:
git remote add origin https://github.com/twoj-username/pokopiemy.git
git push -u origin main
```

---

## KROK 2: Konfiguracja IONOS Deploy Now

### 2.1. Zaloguj się do IONOS

1. Przejdź do https://www.ionos.com/
2. Zaloguj się do swojego konta
3. Przejdź do **Deploy Now**

### 2.2. Połącz repozytorium GitHub

1. Kliknij **Add new project**
2. Wybierz **GitHub** jako źródło
3. Autoryzuj dostęp do GitHub
4. Wybierz repozytorium `pokopiemy`

### 2.3. Konfiguracja build

Deploy Now automatycznie wykryje Next.js. Sprawdź ustawienia:

- **Build command:** `npm run build`
- **Output directory:** `out` (domyślny dla Next.js static export)
- **Node version:** Wybierz najnowszą dostępną wersję

### 2.4. Wdróż

1. Kliknij **Deploy**
2. Poczekaj na zakończenie builda (2-5 minut)
3. Aplikacja będzie dostępna pod adresem: `https://pokopiemy-xyz.ionos.space`

---

## KROK 3: Konfiguracja domeny pokopiemy.com

### 3.1. Dodaj domenę w Deploy Now

1. W projekcie przejdź do **Settings** > **Domains**
2. Kliknij **Add Domain**
3. Wpisz `pokopiemy.com`
4. Postępuj zgodnie z instrukcjami

### 3.2. Konfiguracja DNS

W panelu IONOS (lub u rejestratora domeny) dodaj rekordy DNS zgodnie z instrukcjami Deploy Now.

---

## KROK 4: Backend API na zewnętrznym serwisie

Ponieważ Deploy Now nie obsługuje API routes, musisz wdrożyć backend osobno.

### 4.1. Opcja A: Vercel (Rekomendowane)

1. Utwórz osobny projekt w Vercel dla API
2. Wdróż tylko katalog `app/api/`
3. Skonfiguruj domenę API (np. `api.pokopiemy.com`)

### 4.2. Opcja B: Railway

1. Zarejestruj się na https://railway.app
2. Utwórz nowy projekt
3. Wdróż backend API
4. Skonfiguruj domenę

### 4.3. Opcja C: Render

1. Zarejestruj się na https://render.com
2. Utwórz nowy Web Service
3. Wdróż backend API
4. Skonfiguruj domenę

---

## KROK 5: Aktualizacja frontendu do użycia zewnętrznego API

### 5.1. Utwórz plik konfiguracyjny

```typescript
// lib/api-config.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.pokopiemy.com';
```

### 5.2. Zaktualizuj wywołania API

Zamiast `/api/...` użyj `${API_BASE_URL}/api/...`

### 5.3. Dodaj zmienną środowiskową

W Deploy Now dodaj:
```
NEXT_PUBLIC_API_URL=https://api.pokopiemy.com
```

---

## ⚠️ PROBLEM: Aplikacja wymaga pełnego Next.js

Twoja aplikacja Pokopiemy używa:
- ✅ API routes (`/api/auth/...`, `/api/matches/...`)
- ✅ NextAuth.js (wymaga serwera)
- ✅ Zapisywanie do plików (wymaga serwera)

**Deploy Now NIE obsłuży tych funkcji!**

---

## 🎯 REKOMENDOWANE ROZWIĄZANIE: Vercel

Zamiast IONOS Deploy Now, użyj **Vercel** - to najlepsze rozwiązanie dla Next.js:

### Dlaczego Vercel?

- ✅ Pełna obsługa Next.js (w tym API routes)
- ✅ NextAuth.js działa out-of-the-box
- ✅ Automatyczne SSL
- ✅ Globalny CDN
- ✅ Darmowy plan
- ✅ Zero konfiguracji

### Instrukcja wdrożenia na Vercel:

📖 Zobacz plik **`vercel-deployment.md`**

---

## Alternatywa: Upgrade do IONOS VPS

Jeśli chcesz zostać przy IONOS, rozważ upgrade do **IONOS VPS**:

1. **Zalety:**
   - Pełny dostęp root
   - Możesz zainstalować Node.js
   - Możesz użyć PM2
   - Pełna kontrola

2. **Instrukcja:**
   - Zobacz plik **`DEPLOYMENT.md`** (instrukcja dla VPS)

---

## Podsumowanie opcji

| Rozwiązanie | Koszt | Funkcjonalność | Trudność |
|------------|-------|----------------|----------|
| **IONOS Deploy Now** | ✅ W pakiecie | ❌ Ograniczona (tylko statyczny) | ⭐⭐ |
| **Vercel** | ✅ Darmowy | ✅ Pełna | ⭐ |
| **IONOS VPS** | 💰 Płatny | ✅ Pełna | ⭐⭐⭐ |

---

## Rekomendacja końcowa

**Użyj Vercel** - to najlepsze rozwiązanie dla aplikacji Next.js z API routes.

📖 **Instrukcja:** `vercel-deployment.md`


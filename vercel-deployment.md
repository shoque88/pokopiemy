# Wdrożenie Pokopiemy na Vercel (Rekomendowane rozwiązanie)

Jeśli IONOS Web Hosting Plus nie obsługuje Node.js, Vercel jest idealnym rozwiązaniem dla aplikacji Next.js.

## Dlaczego Vercel?

- ✅ Darmowy plan (wystarczy dla większości aplikacji)
- ✅ Pełna obsługa Next.js
- ✅ Automatyczne SSL
- ✅ Globalny CDN
- ✅ Automatyczne deployment z Git
- ✅ Zero konfiguracji serwera

---

## KROK 1: Przygotowanie repozytorium Git

### 1.1. Utwórz repozytorium

```bash
# W katalogu projektu
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Utwórz repozytorium na GitHub/GitLab/Bitbucket
# Następnie:
git remote add origin https://github.com/twoj-username/pokopiemy.git
git push -u origin main
```

---

## KROK 2: Rejestracja na Vercel

1. Przejdź do https://vercel.com
2. Kliknij **Sign Up**
3. Zaloguj się przez GitHub/GitLab/Bitbucket
4. Zaakceptuj warunki

---

## KROK 3: Wdrożenie projektu

### 3.1. Import projektu

1. W dashboardzie Vercel kliknij **Add New Project**
2. Wybierz repozytorium `pokopiemy`
3. Vercel automatycznie wykryje Next.js

### 3.2. Konfiguracja zmiennych środowiskowych

W sekcji **Environment Variables** dodaj wszystkie zmienne z pliku `.env`:

```
JWT_SECRET=twoj-jwt-secret
NEXTAUTH_SECRET=twoj-nextauth-secret
NEXTAUTH_URL=https://pokopiemy.com
GOOGLE_CLIENT_ID=twoj-google-client-id
GOOGLE_CLIENT_SECRET=twoj-google-client-secret
FACEBOOK_CLIENT_ID=twoj-facebook-app-id
FACEBOOK_CLIENT_SECRET=twoj-facebook-app-secret
AZURE_AD_CLIENT_ID=twoj-azure-ad-client-id
AZURE_AD_CLIENT_SECRET=twoj-azure-ad-client-secret
AZURE_AD_TENANT_ID=twoj-azure-ad-tenant-id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=twoj-email@gmail.com
SMTP_PASS=twoje-haslo
SMTP_FROM=noreply@pokopiemy.com
```

### 3.3. Wdróż

1. Kliknij **Deploy**
2. Poczekaj na zakończenie wdrożenia (2-3 minuty)
3. Aplikacja będzie dostępna pod adresem: `https://pokopiemy-xyz.vercel.app`

---

## KROK 4: Konfiguracja domeny pokopiemy.com

### 4.1. Dodaj domenę w Vercel

1. W projekcie przejdź do **Settings** > **Domains**
2. Kliknij **Add Domain**
3. Wpisz `pokopiemy.com`
4. Vercel wyświetli instrukcje konfiguracji DNS

### 4.2. Konfiguracja DNS w IONOS

W panelu IONOS (lub u rejestratora domeny) dodaj rekordy DNS:

**Rekord CNAME:**
- Nazwa: `@` lub `pokopiemy.com`
- Wartość: `cname.vercel-dns.com`
- TTL: 3600

**LUB rekord A:**
- Nazwa: `@`
- Wartość: (IP podany przez Vercel)

**Dla www:**
- Nazwa: `www`
- Wartość: `cname.vercel-dns.com`

### 4.3. SSL

Vercel automatycznie wystawi certyfikat SSL dla Twojej domeny (może zająć kilka minut).

---

## KROK 5: Aktualizacja OAuth Redirect URIs

Zaktualizuj redirect URIs w panelach OAuth na:
- `https://pokopiemy.com/api/auth/callback/google`
- `https://pokopiemy.com/api/auth/callback/facebook`
- `https://pokopiemy.com/api/auth/callback/azure-ad`

---

## KROK 6: Problem z bazą danych (plik JSON)

Vercel używa systemu plików tylko do odczytu. Musisz zmienić sposób przechowywania danych.

### 6.1. Opcje rozwiązania:

**Opcja A: Użyj Vercel KV (Redis)**
- Darmowy plan: 256 MB
- Szybki i prosty

**Opcja B: Użyj zewnętrznej bazy danych**
- MongoDB Atlas (darmowy plan)
- PostgreSQL (Railway, Supabase)
- MySQL (PlanetScale)

**Opcja C: Użyj Vercel Blob Storage**
- Do przechowywania plików JSON

### 6.2. Szybkie rozwiązanie - Vercel KV

1. W projekcie Vercel przejdź do **Storage**
2. Utwórz **KV Database**
3. Zaktualizuj kod w `lib/db.ts` aby używał Vercel KV

---

## KROK 7: Automatyczne deployment

Vercel automatycznie wdraża aplikację przy każdym pushu do repozytorium Git.

```bash
git add .
git commit -m "Update"
git push
# Vercel automatycznie wdroży zmiany
```

---

## Koszty

**Darmowy plan Vercel:**
- ✅ 100 GB bandwidth/miesiąc
- ✅ Nieograniczone requesty
- ✅ Automatyczne SSL
- ✅ Globalny CDN
- ✅ Wystarczy dla większości aplikacji

**Jeśli potrzebujesz więcej:**
- Pro plan: $20/miesiąc
- Enterprise: Custom pricing

---

## Weryfikacja

1. Otwórz `https://pokopiemy.com`
2. Sprawdź czy aplikacja działa
3. Sprawdź SSL (kłódka w przeglądarce)
4. Przetestuj logowanie
5. Przetestuj OAuth

---

## Wsparcie

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support


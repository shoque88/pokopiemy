# Instrukcja wdrożenia aplikacji Pokopiemy na IONOS Web Hosting Plus

## Wprowadzenie

IONOS Web Hosting Plus to zarządzany hosting, który wymaga innego podejścia niż VPS. Ta instrukcja jest dostosowana do specyfiki IONOS.

---

## KROK 1: Przygotowanie aplikacji do wdrożenia na IONOS

### 1.1. Sprawdź dostępność Node.js w IONOS

IONOS Web Hosting Plus może mieć ograniczenia dotyczące Node.js. Sprawdź w panelu IONOS:
- Czy Node.js jest dostępny
- Jaka wersja Node.js jest dostępna
- Czy możesz uruchamiać aplikacje Node.js

**Alternatywa:** Jeśli IONOS nie obsługuje Node.js bezpośrednio, możesz potrzebować:
- IONOS VPS (płatny upgrade)
- Lub użyć zewnętrznego serwisu do hostowania Node.js (np. Vercel, Railway, Render)

### 1.2. Przygotuj plik .env dla produkcji

Utwórz plik `.env` z następującą konfiguracją:

```env
# JWT Secret Key (wygeneruj nowy bezpieczny klucz!)
JWT_SECRET=twoj-bezpieczny-jwt-secret-tutaj

# NextAuth Secret (wygeneruj nowy bezpieczny klucz!)
NEXTAUTH_SECRET=twoj-bezpieczny-nextauth-secret-tutaj
NEXTAUTH_URL=https://pokopiemy.com

# Google OAuth - ZMIEŃ redirect URI na produkcyjny!
GOOGLE_CLIENT_ID=twoj-google-client-id
GOOGLE_CLIENT_SECRET=twoj-google-client-secret

# Facebook OAuth - ZMIEŃ redirect URI na produkcyjny!
FACEBOOK_CLIENT_ID=twoj-facebook-app-id
FACEBOOK_CLIENT_SECRET=twoj-facebook-app-secret

# Microsoft Azure AD OAuth - ZMIEŃ redirect URI na produkcyjny!
AZURE_AD_CLIENT_ID=twoj-azure-ad-client-id
AZURE_AD_CLIENT_SECRET=twoj-azure-ad-client-secret
AZURE_AD_TENANT_ID=twoj-azure-ad-tenant-id

# SMTP Configuration (dla powiadomień e-mail)
SMTP_HOST=smtp.ionos.com
SMTP_PORT=587
SMTP_USER=twoj-email@pokopiemy.com
SMTP_PASS=twoje-haslo
SMTP_FROM=noreply@pokopiemy.com

# Node Environment
NODE_ENV=production
```

### 1.3. Wygeneruj bezpieczne klucze

```bash
# Generuj JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generuj NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## KROK 2: Konfiguracja domeny w IONOS

### 2.1. Połącz domenę z hostingiem

1. Zaloguj się do **IONOS Control Panel**
2. Przejdź do **Domains & SSL**
3. Wybierz domenę `pokopiemy.com`
4. Upewnij się, że domena jest połączona z Twoim hostingiem

### 2.2. Skonfiguruj subdomenę www (opcjonalnie)

W panelu IONOS możesz skonfigurować przekierowanie z `www.pokopiemy.com` na `pokopiemy.com`

---

## KROK 3: Wdrożenie przez IONOS File Manager (jeśli Node.js jest dostępny)

### 3.1. Zaloguj się do IONOS Control Panel

1. Zaloguj się na https://www.ionos.com/
2. Przejdź do **My Account** > **Web Hosting**
3. Wybierz swój pakiet **Web Hosting Plus**

### 3.2. Użyj File Manager lub FTP

**Opcja A: File Manager (przez przeglądarkę)**
1. W panelu IONOS znajdź **File Manager**
2. Przejdź do katalogu głównego (zwykle `htdocs` lub `public_html`)
3. Usuń domyślne pliki (jeśli są)
4. Prześlij pliki aplikacji

**Opcja B: FTP (zalecane dla większych plików)**
1. W panelu IONOS znajdź dane FTP:
   - Host: `ftp.pokopiemy.com` lub IP serwera
   - Użytkownik: (podany w panelu)
   - Hasło: (podane w panelu)
2. Połącz się przez klienta FTP (FileZilla, WinSCP)
3. Prześlij pliki do katalogu głównego

### 3.3. Struktura plików na serwerze

```
/
├── .env                    # Plik konfiguracyjny (WAŻNE!)
├── package.json
├── next.config.js
├── ecosystem.config.js
├── .next/                 # Zbudowana aplikacja
├── data/                  # Dane aplikacji (będzie utworzony automatycznie)
├── node_modules/          # Zależności
└── app/                   # Kod źródłowy
```

---

## KROK 4: Konfiguracja Node.js w IONOS (jeśli dostępne)

### 4.1. Sprawdź dostępność Node.js

1. W panelu IONOS poszukaj sekcji **Node.js** lub **Applications**
2. Sprawdź dostępne wersje Node.js
3. Jeśli Node.js jest dostępny, aktywuj go dla swojej domeny

### 4.2. Konfiguracja aplikacji Node.js

IONOS może wymagać specjalnej konfiguracji. Sprawdź w dokumentacji IONOS:
- Jak uruchomić aplikację Node.js
- Czy potrzebujesz pliku `package.json` w katalogu głównym
- Czy są jakieś specjalne wymagania

### 4.3. Alternatywne rozwiązanie: Build statyczny

Jeśli IONOS nie obsługuje Node.js, możesz zbudować aplikację jako statyczną:

```bash
# Zaktualizuj next.config.js
```

Dodaj do `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Eksportuj jako statyczną stronę
  reactStrictMode: true,
  // Wyłącz funkcje wymagające serwera
  trailingSlash: true,
}

module.exports = nextConfig
```

**UWAGA:** To rozwiązanie ma ograniczenia:
- Nie będzie działać API routes
- Nie będzie działać autoryzacja przez NextAuth
- Nie będzie działać zapisywanie danych

**Lepiej:** Użyj zewnętrznego hostingu dla backendu (np. Railway, Render, Vercel)

---

## KROK 5: Konfiguracja SSL w IONOS

### 5.1. Aktywuj SSL w panelu IONOS

1. W panelu IONOS przejdź do **Domains & SSL**
2. Wybierz domenę `pokopiemy.com`
3. Kliknij **SSL Certificate** lub **Let's Encrypt**
4. Aktywuj certyfikat SSL (IONOS zwykle robi to automatycznie)

### 5.2. Wymuś HTTPS

IONOS zwykle automatycznie przekierowuje HTTP na HTTPS. Sprawdź w ustawieniach domeny.

---

## KROK 6: Konfiguracja .htaccess (jeśli potrzebne)

Jeśli IONOS używa Apache, możesz potrzebować pliku `.htaccess`:

```apache
# Przekierowanie HTTP na HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Przekierowanie www na non-www (opcjonalnie)
RewriteCond %{HTTP_HOST} ^www\.(.*)$ [NC]
RewriteRule ^(.*)$ https://%1/$1 [R=301,L]

# Routing dla Next.js (jeśli używasz statycznego exportu)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]
```

---

## KROK 7: Aktualizacja OAuth Redirect URIs

### 7.1. Google OAuth

1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/)
2. Otwórz swój projekt
3. Przejdź do **APIs & Services** > **Credentials**
4. Kliknij na swój OAuth 2.0 Client ID
5. W sekcji **Authorized redirect URIs** dodaj:
   - `https://pokopiemy.com/api/auth/callback/google`
6. Zapisz zmiany

### 7.2. Facebook OAuth

1. Przejdź do [Facebook Developers](https://developers.facebook.com/)
2. Otwórz swoją aplikację
3. Przejdź do **Settings** > **Basic**
4. W sekcji **Valid OAuth Redirect URIs** dodaj:
   - `https://pokopiemy.com/api/auth/callback/facebook`
5. Zapisz zmiany

### 7.3. Microsoft Azure AD OAuth

1. Przejdź do [Azure Portal](https://portal.azure.com/)
2. Otwórz **Azure Active Directory** > **App registrations**
3. Wybierz swoją aplikację
4. Przejdź do **Authentication**
5. W sekcji **Redirect URIs** dodaj:
   - `https://pokopiemy.com/api/auth/callback/azure-ad`
6. Zapisz zmiany

---

## KROK 8: Alternatywne rozwiązanie - Hybrydowe wdrożenie

Jeśli IONOS Web Hosting Plus nie obsługuje Node.js, możesz użyć hybrydowego podejścia:

### 8.1. Frontend na IONOS (statyczny)

1. Zbuduj aplikację jako statyczną (z ograniczeniami)
2. Wdróż na IONOS

### 8.2. Backend na zewnętrznym serwisie

Użyj jednego z tych serwisów dla backendu:
- **Vercel** (darmowy plan dla Next.js)
- **Railway** (darmowy plan)
- **Render** (darmowy plan)
- **Fly.io** (darmowy plan)

**Konfiguracja:**
1. Wdróż backend API na zewnętrznym serwisie
2. Zaktualizuj zmienne środowiskowe w frontendzie
3. Skonfiguruj CORS w backendzie

---

## KROK 9: Weryfikacja wdrożenia

### 9.1. Sprawdź dostępność strony

1. Otwórz `https://pokopiemy.com` w przeglądarce
2. Sprawdź czy strona się ładuje
3. Sprawdź czy SSL działa (kłódka w przeglądarce)

### 9.2. Sprawdź funkcjonalności

- ✅ Strona główna się ładuje
- ✅ Logowanie działa
- ✅ OAuth działa (po skonfigurowaniu)
- ✅ HTTPS działa poprawnie

---

## KROK 10: Kontakt z IONOS Support

Jeśli masz problemy, skontaktuj się z IONOS Support:

1. **Telefon:** (sprawdź w panelu IONOS)
2. **Email:** support@ionos.com
3. **Chat:** Dostępny w panelu IONOS
4. **Dokumentacja:** https://www.ionos.com/help/

**Pytania do zadania:**
- Czy Web Hosting Plus obsługuje Node.js?
- Jak uruchomić aplikację Node.js?
- Jakie są limity dla aplikacji Node.js?
- Czy mogę użyć PM2 lub podobnego narzędzia?

---

## Rozwiązywanie problemów

### Problem: Aplikacja nie startuje

**Rozwiązanie:**
1. Sprawdź logi w panelu IONOS
2. Sprawdź czy Node.js jest aktywne
3. Sprawdź czy plik `.env` istnieje i jest poprawnie skonfigurowany
4. Skontaktuj się z IONOS Support

### Problem: Błąd 500 Internal Server Error

**Rozwiązanie:**
1. Sprawdź logi błędów w panelu IONOS
2. Sprawdź uprawnienia do plików
3. Sprawdź czy wszystkie zależności są zainstalowane
4. Sprawdź konfigurację `.env`

### Problem: SSL nie działa

**Rozwiązanie:**
1. Sprawdź w panelu IONOS czy SSL jest aktywne
2. Poczekaj na propagację (może zająć kilka godzin)
3. Skontaktuj się z IONOS Support

### Problem: OAuth nie działa

**Rozwiązanie:**
1. Sprawdź czy redirect URIs są poprawnie skonfigurowane
2. Sprawdź czy `NEXTAUTH_URL` w `.env` jest ustawione na `https://pokopiemy.com`
3. Sprawdź logi aplikacji

---

## Ważne uwagi dla IONOS

1. **Ograniczenia hostingu współdzielonego:**
   - Może nie obsługiwać Node.js bezpośrednio
   - Może mieć ograniczenia w konfiguracji serwera
   - Może nie pozwalać na instalację własnych narzędzi (PM2, etc.)

2. **Alternatywy:**
   - Rozważ upgrade do IONOS VPS (jeśli dostępny)
   - Rozważ użycie zewnętrznego hostingu dla backendu
   - Rozważ użycie Vercel (darmowy plan dla Next.js)

3. **Backup:**
   - Regularnie rób backup katalogu `data/`
   - Użyj File Manager lub FTP do pobrania plików

---

## Rekomendacja

**Jeśli IONOS Web Hosting Plus nie obsługuje Node.js:**

Najlepszym rozwiązaniem będzie użycie **Vercel** (darmowy plan) do hostowania aplikacji Next.js:

1. **Zalety:**
   - Darmowy plan
   - Pełna obsługa Next.js
   - Automatyczne SSL
   - Automatyczne deployment z Git
   - Globalny CDN

2. **Jak wdrożyć na Vercel:**
   - Zarejestruj się na https://vercel.com
   - Połącz repozytorium Git
   - Vercel automatycznie wykryje Next.js i wdroży aplikację
   - Skonfiguruj domenę `pokopiemy.com` w Vercel

3. **Koszt:** Darmowy plan wystarczy dla większości aplikacji

---

## Następne kroki

1. **Sprawdź w panelu IONOS** czy Node.js jest dostępny
2. **Skontaktuj się z IONOS Support** jeśli masz pytania
3. **Rozważ alternatywne rozwiązanie** (Vercel, Railway, etc.) jeśli IONOS nie obsługuje Node.js
4. **Przetestuj aplikację** po wdrożeniu

---

## Kontakt i wsparcie

- **IONOS Support:** https://www.ionos.com/help/
- **Dokumentacja IONOS:** https://www.ionos.com/help/
- **Vercel (alternatywa):** https://vercel.com

# ✅ Wdrożenie na Vercel zakończone! Co dalej?

## 🎉 Gratulacje!

Twoja aplikacja Pokopiemy jest teraz dostępna na Vercel! 

---

## KROK 1: Skonfiguruj domenę pokopiemy.com

### 1.1. Dodaj domenę w Vercel

1. Przejdź do swojego projektu w Vercel Dashboard
2. Kliknij **Settings** > **Domains**
3. Kliknij **Add Domain**
4. Wpisz `pokopiemy.com`
5. Kliknij **Add**

### 1.2. Konfiguracja DNS

Vercel wyświetli instrukcje konfiguracji DNS. Masz dwie opcje:

**Opcja A: Rekord A (najprostsze)**
- W panelu IONOS (lub u rejestratora domeny) dodaj:
  - **Typ:** A
  - **Nazwa:** `@` lub `pokopiemy.com`
  - **Wartość:** (IP podany przez Vercel, np. `76.76.21.21`)
  - **TTL:** 3600

**Opcja B: Rekord CNAME (zalecane)**
- W panelu IONOS dodaj:
  - **Typ:** CNAME
  - **Nazwa:** `@` lub `pokopiemy.com`
  - **Wartość:** `cname.vercel-dns.com`
  - **TTL:** 3600

**Dla subdomeny www:**
- **Typ:** CNAME
- **Nazwa:** `www`
- **Wartość:** `cname.vercel-dns.com`

### 1.3. SSL Certificate

Vercel automatycznie wystawi certyfikat SSL dla Twojej domeny. Może to zająć kilka minut do kilku godzin.

**Sprawdź status:**
- W Vercel Dashboard: **Settings** > **Domains**
- Status powinien zmienić się z "Pending" na "Valid"

---

## KROK 2: Zaktualizuj zmienne środowiskowe

### 2.1. Sprawdź czy wszystkie zmienne są ustawione

W Vercel Dashboard: **Settings** > **Environment Variables**

Upewnij się, że masz:
- ✅ `NEXTAUTH_URL=https://pokopiemy.com` (WAŻNE! Zmień z localhost)
- ✅ `JWT_SECRET` (bezpieczny klucz)
- ✅ `NEXTAUTH_SECRET` (bezpieczny klucz)
- ✅ OAuth credentials (Google, Facebook, Microsoft)
- ✅ SMTP settings (opcjonalnie)

### 2.2. Zaktualizuj NEXTAUTH_URL

**WAŻNE:** Jeśli `NEXTAUTH_URL` jest ustawione na `http://localhost:3000`, zmień na:
```
NEXTAUTH_URL=https://pokopiemy.com
```

Po zmianie zmiennych środowiskowych, Vercel automatycznie wdroży aplikację ponownie.

---

## KROK 3: Zaktualizuj OAuth Redirect URIs

### 3.1. Google OAuth

1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/)
2. Otwórz swój projekt
3. Przejdź do **APIs & Services** > **Credentials**
4. Kliknij na swój OAuth 2.0 Client ID
5. W sekcji **Authorized redirect URIs** dodaj:
   - `https://pokopiemy.com/api/auth/callback/google`
6. **Usuń** stary URI z localhost (lub zostaw jeśli testujesz lokalnie)
7. Zapisz zmiany

### 3.2. Facebook OAuth

1. Przejdź do [Facebook Developers](https://developers.facebook.com/)
2. Otwórz swoją aplikację
3. Przejdź do **Settings** > **Basic**
4. W sekcji **Valid OAuth Redirect URIs** dodaj:
   - `https://pokopiemy.com/api/auth/callback/facebook`
5. Zapisz zmiany

### 3.3. Microsoft Azure AD OAuth

1. Przejdź do [Azure Portal](https://portal.azure.com/)
2. Otwórz **Azure Active Directory** > **App registrations**
3. Wybierz swoją aplikację
4. Przejdź do **Authentication**
5. W sekcji **Redirect URIs** dodaj:
   - `https://pokopiemy.com/api/auth/callback/azure-ad`
6. Zapisz zmiany

---

## KROK 4: ⚠️ WAŻNE - Problem z bazą danych

### 4.1. Problem

Vercel używa **systemu plików tylko do odczytu**. Twoja aplikacja zapisuje dane do plików JSON w katalogu `data/`, co **NIE będzie działać na Vercel**.

**Funkcje, które NIE będą działać:**
- ❌ Rejestracja użytkowników
- ❌ Logowanie (zapis sesji)
- ❌ Zapisywanie się na mecze
- ❌ Tworzenie meczów
- ❌ Wszystkie operacje zapisu danych

**Funkcje, które BĘDĄ działać:**
- ✅ Przeglądanie strony głównej
- ✅ Wyświetlanie statycznych treści
- ✅ Frontend (UI)

### 4.2. Rozwiązanie: Vercel KV (Redis)

**Najprostsze rozwiązanie** - użyj Vercel KV (darmowy plan: 256 MB):

#### Krok 1: Utwórz Vercel KV Database

1. W projekcie Vercel przejdź do **Storage**
2. Kliknij **Create Database**
3. Wybierz **KV** (Key-Value)
4. Nadaj nazwę (np. "pokopiemy-db")
5. Wybierz region (najbliższy użytkownikom)
6. Kliknij **Create**

#### Krok 2: Zaktualizuj kod

Muszę zaktualizować `lib/db.ts` aby używał Vercel KV zamiast plików JSON.

**Czy chcesz, żebym zaktualizował kod teraz?**

---

## KROK 5: Przetestuj aplikację

### 5.1. Sprawdź dostępność

1. Otwórz `https://pokopiemy.com` (lub URL Vercel jeśli domena jeszcze nie działa)
2. Sprawdź czy strona się ładuje
3. Sprawdź czy SSL działa (kłódka w przeglądarce)

### 5.2. Przetestuj funkcje

- ✅ Strona główna się ładuje
- ✅ Filtrowanie meczów działa
- ⚠️ Logowanie/rejestracja (będzie działać po skonfigurowaniu bazy danych)
- ⚠️ Zapisywanie się na mecze (będzie działać po skonfigurowaniu bazy danych)

---

## KROK 6: Monitorowanie i utrzymanie

### 6.1. Vercel Dashboard

- **Deployments** - zobacz historię wdrożeń
- **Analytics** - statystyki ruchu (wymaga upgrade)
- **Logs** - logi aplikacji
- **Settings** - konfiguracja projektu

### 6.2. Automatyczne deployment

Vercel automatycznie wdraża aplikację przy każdym pushu do repozytorium:

```bash
git add .
git commit -m "Update"
git push
# Vercel automatycznie wdroży zmiany
```

### 6.3. Sprawdzanie logów

W Vercel Dashboard: **Deployments** > Wybierz deployment > **Functions** > Zobacz logi

---

## 🎯 Priorytetowe zadania

### Teraz (wymagane):

1. ✅ **Skonfiguruj domenę** pokopiemy.com w Vercel
2. ✅ **Zaktualizuj NEXTAUTH_URL** na `https://pokopiemy.com`
3. ✅ **Zaktualizuj OAuth Redirect URIs** w panelach OAuth

### Następnie (ważne):

4. ⚠️ **Skonfiguruj bazę danych** (Vercel KV lub zewnętrzna baza)
5. ⚠️ **Zaktualizuj kod** aby używał bazy danych zamiast plików JSON

### Opcjonalnie:

6. Skonfiguruj monitoring i analytics
7. Skonfiguruj backup danych
8. Zoptymalizuj wydajność

---

## 📋 Checklist

- [ ] Domena pokopiemy.com skonfigurowana w Vercel
- [ ] DNS skonfigurowany (rekordy A lub CNAME)
- [ ] SSL certyfikat aktywny
- [ ] NEXTAUTH_URL zaktualizowany na `https://pokopiemy.com`
- [ ] Google OAuth redirect URI zaktualizowany
- [ ] Facebook OAuth redirect URI zaktualizowany
- [ ] Microsoft OAuth redirect URI zaktualizowany
- [ ] Vercel KV Database utworzony (lub inna baza danych)
- [ ] Kod zaktualizowany do użycia bazy danych
- [ ] Aplikacja przetestowana i działa poprawnie

---

## 🆘 Jeśli potrzebujesz pomocy

**Problem z domeną:**
- Sprawdź DNS: `nslookup pokopiemy.com`
- Sprawdź status w Vercel Dashboard
- Poczekaj na propagację DNS (może zająć do 48 godzin)

**Problem z OAuth:**
- Sprawdź czy redirect URIs są poprawne
- Sprawdź czy `NEXTAUTH_URL` jest ustawione poprawnie
- Sprawdź logi w Vercel Dashboard

**Problem z bazą danych:**
- Zobacz sekcję "KROK 4" powyżej
- Skontaktuj się ze mną, a zaktualizuję kod

---

## 🎉 Gratulacje!

Twoja aplikacja jest teraz dostępna online! 

**Następny krok:** Skonfiguruj bazę danych, aby aplikacja działała w pełni.


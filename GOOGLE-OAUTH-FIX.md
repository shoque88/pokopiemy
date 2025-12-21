# 🔧 Naprawa błędu Google OAuth: redirect_uri_mismatch

## Problem
Błąd: `redirect_uri_mismatch` - aplikacja próbuje użyć `https://www.pokopiemy.com/api/auth/callback/google`, ale w Google Cloud Console jest zarejestrowane tylko `https://pokopiemy.com/api/auth/callback/google` (bez www).

## Rozwiązanie

### 1. Dodaj oba warianty redirect URI w Google Cloud Console

1. Przejdź do: https://console.cloud.google.com/
2. Wybierz swój projekt
3. Przejdź do: **APIs & Services** → **Credentials**
4. Kliknij na swój **OAuth 2.0 Client ID**
5. W sekcji **Authorized redirect URIs** dodaj **oba** warianty:
   ```
   https://pokopiemy.com/api/auth/callback/google
   https://www.pokopiemy.com/api/auth/callback/google
   ```
6. W sekcji **Authorized JavaScript origins** dodaj **oba** warianty:
   ```
   https://pokopiemy.com
   https://www.pokopiemy.com
   ```
7. Kliknij **Save**

### 2. Sprawdź NEXTAUTH_URL w Vercel

1. Przejdź do: https://vercel.com/dashboard
2. Otwórz projekt **pokopiemy**
3. Przejdź do: **Settings** → **Environment Variables**
4. Sprawdź wartość `NEXTAUTH_URL`:
   - Jeśli użytkownicy wchodzą przez `www.pokopiemy.com`, ustaw: `https://www.pokopiemy.com`
   - Jeśli użytkownicy wchodzą przez `pokopiemy.com`, ustaw: `https://pokopiemy.com`
5. Jeśli zmieniłeś, wykonaj **Redeploy**

### 3. Redeploy w Vercel

1. W Vercel Dashboard: **Deployments**
2. Kliknij **"..."** przy ostatnim deployment
3. Wybierz **Redeploy**
4. Poczekaj na zakończenie

### 4. Sprawdź czy redirect URI został poprawnie zapisany

1. W Google Cloud Console, w sekcji **Authorized redirect URIs**, sprawdź dokładnie:
   - Czy widzisz: `https://www.pokopiemy.com/api/auth/callback/google`
   - Czy nie ma spacji na początku/końcu
   - Czy nie ma dodatkowych znaków
   - **Skopiuj dokładnie** ten URI z Google Cloud Console i porównaj z błędem

2. Jeśli URI wygląda poprawnie, ale nadal masz błąd:
   - **Poczekaj 2-5 minut** - Google może potrzebować czasu na propagację zmian
   - **Wyczyść cache przeglądarki** (Ctrl+Shift+Delete)
   - **Spróbuj w trybie incognito/private**

### 5. Sprawdź NEXTAUTH_URL w Vercel (WAŻNE!)

1. Przejdź do: https://vercel.com/dashboard
2. Otwórz projekt **pokopiemy**
3. Przejdź do: **Settings** → **Environment Variables**
4. **Sprawdź dokładnie** wartość `NEXTAUTH_URL`:
   - Musi być: `https://www.pokopiemy.com` (z www, jeśli używasz www)
   - Lub: `https://pokopiemy.com` (bez www, jeśli używasz bez www)
   - **BEZ ukośnika na końcu!**
   - **BEZ spacji!**

5. Jeśli `NEXTAUTH_URL` jest niepoprawne:
   - Kliknij na zmienną
   - Edytuj wartość
   - Ustaw dokładnie: `https://www.pokopiemy.com` (lub `https://pokopiemy.com`)
   - Zapisz
   - **Wykonaj Redeploy** (patrz krok 3)

### 6. Debugowanie - sprawdź dokładny redirect URI

Z błędu widzę, że aplikacja próbuje użyć:
```
redirect_uri=https://www.pokopiemy.com/api/auth/callback/google
```

**Upewnij się, że w Google Cloud Console masz DOKŁADNIE ten sam URI:**
- Otwórz Google Cloud Console
- Przejdź do: **APIs & Services** → **Credentials**
- Kliknij na swój **OAuth 2.0 Client ID**
- W sekcji **Authorized redirect URIs** sprawdź czy widzisz:
  ```
  https://www.pokopiemy.com/api/auth/callback/google
  ```
- **Skopiuj ten URI** i porównaj z błędem - muszą być IDENTYCZNE

### 7. Jeśli nadal nie działa - usuń i dodaj ponownie

1. W Google Cloud Console, w sekcji **Authorized redirect URIs**:
   - **Usuń** wszystkie wpisy związane z pokopiemy.com
   - **Dodaj ponownie** ręcznie (nie kopiuj-wklej):
     ```
     https://pokopiemy.com/api/auth/callback/google
     https://www.pokopiemy.com/api/auth/callback/google
     ```
   - **Zapisz**
   - **Poczekaj 2-3 minuty**

2. W Vercel:
   - Sprawdź `NEXTAUTH_URL` = `https://www.pokopiemy.com`
   - Wykonaj **Redeploy**

3. Wyczyść cache przeglądarki i spróbuj ponownie

### 8. Przetestuj

1. Otwórz aplikację w trybie incognito
2. Spróbuj zalogować się przez Google
3. Powinno działać! ✅

## Ważne

- Google wymaga **dokładnego dopasowania** redirect URI (znak w znak!)
- Musisz dodać **oba** warianty (z www i bez www) jeśli oba są używane
- Po zmianie redirect URI w Google, zmiany mogą potrzebować **2-5 minut** na propagację
- Po zmianie `NEXTAUTH_URL` w Vercel, **MUSISZ** zrobić redeploy
- `NEXTAUTH_URL` musi być **bez ukośnika na końcu** i **bez spacji**


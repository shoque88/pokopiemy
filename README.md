# Pokopiemy

Platforma do organizowania i zapisywania się na amatorskie mecze piłki nożnej w lokalnych społecznościach.

## Instalacja

```bash
npm install
```

## Konfiguracja OAuth

Aby włączyć logowanie przez Google, Facebook i Microsoft, utwórz plik `.env` na podstawie `.env.example` i uzupełnij dane:

### Google OAuth
1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/)
2. Utwórz nowy projekt lub wybierz istniejący
3. Włącz Google+ API
4. Utwórz OAuth 2.0 Client ID
5. Dodaj `http://localhost:3000/api/auth/callback/google` do Authorized redirect URIs
6. Skopiuj Client ID i Client Secret do `.env`

### Facebook OAuth
1. Przejdź do [Facebook Developers](https://developers.facebook.com/)
2. Utwórz nową aplikację
3. Dodaj produkt "Facebook Login"
4. W ustawieniach dodaj `http://localhost:3000/api/auth/callback/facebook` do Valid OAuth Redirect URIs
5. Skopiuj App ID i App Secret do `.env`

### Microsoft Azure AD OAuth
1. Przejdź do [Azure Portal](https://portal.azure.com/)
2. Utwórz nową rejestrację aplikacji w Azure Active Directory
3. Dodaj redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
4. Skopiuj Application (client) ID, Directory (tenant) ID i utworz Client Secret
5. Dodaj dane do `.env`

## Uruchomienie

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem http://localhost:3000

## Funkcje

- Przeglądanie i filtrowanie nadchodzących meczów
- Zapisywanie się na mecze
- Zarządzanie meczami przez organizatorów
- Automatyczne zarządzanie statusem meczów
- Powiadomienia e-mail przy odwołaniu meczu
- Logowanie przez Google, Facebook i Microsoft (OAuth)

## Domyślne konto administratora

- Email: `admin@pokopiemy.pl`
- Hasło: `admin123`

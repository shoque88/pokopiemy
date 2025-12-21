# Instrukcja wdrożenia aplikacji Pokopiemy na serwer produkcyjny

## Wymagania wstępne

- Serwer z systemem Linux (Ubuntu/Debian/CentOS)
- Dostęp root/sudo do serwera
- Domena pokopiemy.com skonfigurowana i wskazująca na IP serwera
- Node.js 18+ zainstalowany na serwerze
- npm zainstalowany

---

## KROK 1: Przygotowanie aplikacji do produkcji

### 1.1. Zaktualizuj zmienne środowiskowe dla produkcji

Na serwerze utwórz plik `.env` z konfiguracją produkcyjną:

```bash
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
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=twoj-email@gmail.com
SMTP_PASS=twoje-haslo-aplikacji
SMTP_FROM=noreply@pokopiemy.com

# Node Environment
NODE_ENV=production
```

### 1.2. Wygeneruj bezpieczne klucze

Na serwerze wykonaj:

```bash
# Generuj JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generuj NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Skopiuj wygenerowane wartości do pliku `.env`.

---

## KROK 2: Konfiguracja DNS

### 2.1. Skonfiguruj rekordy DNS dla domeny pokopiemy.com

W panelu zarządzania domeną (u Twojego rejestratora) dodaj:

**Rekord A:**
- Nazwa: `@` lub `pokopiemy.com`
- Wartość: IP Twojego serwera
- TTL: 3600

**Rekord A (dla www):**
- Nazwa: `www`
- Wartość: IP Twojego serwera
- TTL: 3600

**Opcjonalnie - rekord CNAME:**
- Nazwa: `www`
- Wartość: `pokopiemy.com`
- TTL: 3600

Poczekaj na propagację DNS (może zająć do 24-48 godzin, zwykle kilka minut).

Sprawdź propagację:
```bash
nslookup pokopiemy.com
ping pokopiemy.com
```

---

## KROK 3: Instalacja na serwerze

### 3.1. Skopiuj pliki na serwer

```bash
# Na Twoim lokalnym komputerze
scp -r pokopiemy/ user@twoj-serwer-ip:/var/www/

# Lub użyj rsync
rsync -avz pokopiemy/ user@twoj-serwer-ip:/var/www/pokopiemy/
```

### 3.2. Połącz się z serwerem

```bash
ssh user@twoj-serwer-ip
cd /var/www/pokopiemy
```

### 3.3. Zainstaluj zależności

```bash
# Upewnij się, że Node.js jest zainstalowany
node --version
npm --version

# Zainstaluj zależności
npm install --production
```

### 3.4. Utwórz plik .env

```bash
nano .env
# Wklej zawartość z KROKU 1.1
# Zapisz: Ctrl+O, Enter, Ctrl+X
```

---

## KROK 4: Build aplikacji

```bash
# Zbuduj aplikację produkcyjną
npm run build
```

To utworzy zoptymalizowaną wersję aplikacji w katalogu `.next/`.

---

## KROK 5: Instalacja i konfiguracja PM2 (Process Manager)

PM2 pozwoli na uruchomienie aplikacji jako serwisu, który automatycznie się restartuje.

### 5.1. Zainstaluj PM2 globalnie

```bash
npm install -g pm2
```

### 5.2. Utwórz plik konfiguracyjny PM2

```bash
nano ecosystem.config.js
```

Wklej następującą konfigurację:

```javascript
module.exports = {
  apps: [{
    name: 'pokopiemy',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/pokopiemy',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pokopiemy/error.log',
    out_file: '/var/log/pokopiemy/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

### 5.3. Utwórz katalog na logi

```bash
sudo mkdir -p /var/log/pokopiemy
sudo chown $USER:$USER /var/log/pokopiemy
```

### 5.4. Uruchom aplikację przez PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Ostatnia komenda wyświetli instrukcję, którą musisz wykonać jako root, aby PM2 uruchamiał się przy starcie systemu.

---

## KROK 6: Instalacja i konfiguracja Nginx (Reverse Proxy)

Nginx będzie obsługiwał HTTPS i przekierowywał ruch do aplikacji Next.js.

### 6.1. Zainstaluj Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

### 6.2. Utwórz konfigurację Nginx

```bash
sudo nano /etc/nginx/sites-available/pokopiemy.com
```

Wklej następującą konfigurację:

```nginx
server {
    listen 80;
    server_name pokopiemy.com www.pokopiemy.com;

    # Przekierowanie HTTP na HTTPS (po skonfigurowaniu SSL)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pokopiemy.com www.pokopiemy.com;

    # Ścieżki do certyfikatów SSL (zostaną utworzone w następnym kroku)
    ssl_certificate /etc/letsencrypt/live/pokopiemy.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pokopiemy.com/privkey.pem;

    # Ustawienia SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Maksymalny rozmiar uploadu
    client_max_body_size 10M;

    # Logi
    access_log /var/log/nginx/pokopiemy-access.log;
    error_log /var/log/nginx/pokopiemy-error.log;

    # Proxy do aplikacji Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### 6.3. Aktywuj konfigurację

```bash
sudo ln -s /etc/nginx/sites-available/pokopiemy.com /etc/nginx/sites-enabled/
sudo nginx -t  # Sprawdź konfigurację
sudo systemctl restart nginx
```

---

## KROK 7: Instalacja certyfikatu SSL (Let's Encrypt)

### 7.1. Zainstaluj Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 7.2. Tymczasowo wyłącz przekierowanie HTTPS w Nginx

Edytuj `/etc/nginx/sites-available/pokopiemy.com` i zakomentuj linię z `return 301`:

```nginx
# return 301 https://$server_name$request_uri;
```

Zrestartuj Nginx:
```bash
sudo systemctl restart nginx
```

### 7.3. Uzyskaj certyfikat SSL

```bash
sudo certbot --nginx -d pokopiemy.com -d www.pokopiemy.com
```

Certbot automatycznie:
- Uzyska certyfikat
- Skonfiguruje Nginx
- Ustawi automatyczne odnowienie

### 7.4. Przywróć przekierowanie HTTPS (jeśli zostało usunięte)

Certbot powinien to zrobić automatycznie, ale sprawdź konfigurację.

### 7.5. Sprawdź automatyczne odnowienie

```bash
sudo certbot renew --dry-run
```

---

## KROK 8: Aktualizacja OAuth Redirect URIs

### 8.1. Google OAuth

1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/)
2. Otwórz swój projekt
3. Przejdź do "APIs & Services" > "Credentials"
4. Kliknij na swój OAuth 2.0 Client ID
5. W sekcji "Authorized redirect URIs" dodaj:
   - `https://pokopiemy.com/api/auth/callback/google`
6. Zapisz zmiany

### 8.2. Facebook OAuth

1. Przejdź do [Facebook Developers](https://developers.facebook.com/)
2. Otwórz swoją aplikację
3. Przejdź do "Settings" > "Basic"
4. W sekcji "Valid OAuth Redirect URIs" dodaj:
   - `https://pokopiemy.com/api/auth/callback/facebook`
5. Zapisz zmiany

### 8.3. Microsoft Azure AD OAuth

1. Przejdź do [Azure Portal](https://portal.azure.com/)
2. Otwórz "Azure Active Directory" > "App registrations"
3. Wybierz swoją aplikację
4. Przejdź do "Authentication"
5. W sekcji "Redirect URIs" dodaj:
   - `https://pokopiemy.com/api/auth/callback/azure-ad`
6. Zapisz zmiany

### 8.4. Zaktualizuj plik .env na serwerze

Upewnij się, że w pliku `.env` masz:
```
NEXTAUTH_URL=https://pokopiemy.com
```

Zrestartuj aplikację:
```bash
pm2 restart pokopiemy
```

---

## KROK 9: Konfiguracja Firewall

### 9.1. Ustaw firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

---

## KROK 10: Testowanie

### 10.1. Sprawdź status aplikacji

```bash
pm2 status
pm2 logs pokopiemy
```

### 10.2. Sprawdź Nginx

```bash
sudo systemctl status nginx
sudo nginx -t
```

### 10.3. Sprawdź SSL

```bash
sudo certbot certificates
```

### 10.4. Przetestuj aplikację

Otwórz w przeglądarce:
- `https://pokopiemy.com`
- `https://www.pokopiemy.com`

Sprawdź:
- ✅ Strona główna się ładuje
- ✅ Logowanie działa
- ✅ OAuth działa (po skonfigurowaniu)
- ✅ HTTPS działa poprawnie

---

## KROK 11: Monitorowanie i utrzymanie

### 11.1. Przydatne komendy PM2

```bash
pm2 status              # Status aplikacji
pm2 logs pokopiemy      # Logi w czasie rzeczywistym
pm2 restart pokopiemy    # Restart aplikacji
pm2 stop pokopiemy      # Zatrzymaj aplikację
pm2 start pokopiemy     # Uruchom aplikację
pm2 monit               # Monitor zasobów
```

### 11.2. Aktualizacja aplikacji

```bash
# 1. Zatrzymaj aplikację
pm2 stop pokopiemy

# 2. Zaktualizuj pliki (np. przez git pull lub scp)
git pull
# lub
scp -r nowe-pliki/ user@serwer:/var/www/pokopiemy/

# 3. Zainstaluj nowe zależności (jeśli potrzeba)
npm install --production

# 4. Zbuduj aplikację
npm run build

# 5. Uruchom ponownie
pm2 restart pokopiemy
```

### 11.3. Backup danych

Dane są przechowywane w `/var/www/pokopiemy/data/`. Regularnie rób backup:

```bash
# Utwórz skrypt backupu
nano /root/backup-pokopiemy.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backup/pokopiemy"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/pokopiemy_$DATE.tar.gz /var/www/pokopiemy/data/
# Usuń backupi starsze niż 30 dni
find $BACKUP_DIR -name "pokopiemy_*.tar.gz" -mtime +30 -delete
```

```bash
chmod +x /root/backup-pokopiemy.sh

# Dodaj do cron (codziennie o 2:00)
crontab -e
# Dodaj linię:
0 2 * * * /root/backup-pokopiemy.sh
```

---

## Rozwiązywanie problemów

### Problem: Aplikacja nie startuje

```bash
pm2 logs pokopiemy --lines 50
# Sprawdź błędy w logach
```

### Problem: Nginx zwraca 502 Bad Gateway

```bash
# Sprawdź czy aplikacja działa
pm2 status

# Sprawdź logi Nginx
sudo tail -f /var/log/nginx/pokopiemy-error.log
```

### Problem: Certyfikat SSL wygasa

```bash
# Odnow ręcznie
sudo certbot renew

# Sprawdź automatyczne odnowienie
sudo certbot renew --dry-run
```

### Problem: Błąd "Module not found"

```bash
# Zainstaluj zależności ponownie
npm install --production
npm run build
pm2 restart pokopiemy
```

---

## Bezpieczeństwo

1. **Regularnie aktualizuj system:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Używaj silnych haseł** dla wszystkich kont

3. **Wyłącz logowanie root przez SSH** (jeśli możliwe)

4. **Regularnie rób backup** danych

5. **Monitoruj logi** pod kątem podejrzanej aktywności

---

## Kontakt i wsparcie

W razie problemów sprawdź:
- Logi PM2: `pm2 logs pokopiemy`
- Logi Nginx: `/var/log/nginx/pokopiemy-error.log`
- Logi aplikacji: `/var/log/pokopiemy/`


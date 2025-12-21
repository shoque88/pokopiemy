#!/bin/bash

# Skrypt pomocniczy do wdrożenia aplikacji Pokopiemy
# Użycie: ./deploy.sh

set -e

echo "🚀 Rozpoczynam wdrożenie aplikacji Pokopiemy..."

# Sprawdź czy jesteś w odpowiednim katalogu
if [ ! -f "package.json" ]; then
    echo "❌ Błąd: Uruchom skrypt z katalogu głównego projektu"
    exit 1
fi

# Sprawdź czy .env istnieje
if [ ! -f ".env" ]; then
    echo "⚠️  Ostrzeżenie: Plik .env nie istnieje. Utwórz go przed wdrożeniem."
    read -p "Czy chcesz kontynuować? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Zatrzymaj aplikację jeśli działa
if command -v pm2 &> /dev/null; then
    echo "⏸️  Zatrzymuję aplikację..."
    pm2 stop pokopiemy 2>/dev/null || true
fi

# Zainstaluj zależności
echo "📦 Instaluję zależności..."
npm install --production

# Zbuduj aplikację
echo "🔨 Buduję aplikację..."
npm run build

# Uruchom aplikację
if command -v pm2 &> /dev/null; then
    echo "▶️  Uruchamiam aplikację..."
    pm2 restart pokopiemy || pm2 start ecosystem.config.js
    pm2 save
    echo "✅ Aplikacja uruchomiona!"
    echo "📊 Status:"
    pm2 status
else
    echo "⚠️  PM2 nie jest zainstalowany. Uruchom aplikację ręcznie:"
    echo "   npm start"
fi

echo "✅ Wdrożenie zakończone pomyślnie!"


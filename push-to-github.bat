@echo off
echo Dodawanie zmian do git...
git add .

echo Tworzenie commita...
git commit -m "Migrate from JSON files to Vercel Blob storage"

echo Pushowanie do GitHub...
git push

echo.
echo Gotowe! Zmiany zostaly wyslane do GitHub.
echo Vercel automatycznie wdrozy aktualizacje.
pause



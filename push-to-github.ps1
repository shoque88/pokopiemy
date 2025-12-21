# Skrypt do pushowania zmian do GitHub
Write-Host "Sprawdzanie dostępności git..." -ForegroundColor Yellow

# Sprawdź typowe lokalizacje git
$gitPaths = @(
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\git.exe",
    "$env:ProgramFiles\Git\cmd\git.exe"
)

$gitCmd = $null
foreach ($path in $gitPaths) {
    if (Test-Path $path) {
        $gitCmd = $path
        Write-Host "Znaleziono git w: $path" -ForegroundColor Green
        break
    }
}

# Jeśli nie znaleziono, spróbuj użyć git z PATH
if (-not $gitCmd) {
    try {
        $gitCmd = Get-Command git -ErrorAction Stop | Select-Object -ExpandProperty Source
        Write-Host "Znaleziono git w PATH: $gitCmd" -ForegroundColor Green
    } catch {
        Write-Host "Git nie został znaleziony. Sprawdzam GitHub CLI..." -ForegroundColor Yellow
        
        # Spróbuj GitHub CLI
        try {
            $ghCmd = Get-Command gh -ErrorAction Stop | Select-Object -ExpandProperty Source
            Write-Host "Znaleziono GitHub CLI: $ghCmd" -ForegroundColor Green
            Write-Host ""
            Write-Host "Użyj GitHub Desktop lub wykonaj ręcznie:" -ForegroundColor Cyan
            Write-Host "  git add ." -ForegroundColor White
            Write-Host "  git commit -m 'Migrate from JSON files to Vercel Blob storage'" -ForegroundColor White
            Write-Host "  git push" -ForegroundColor White
            exit
        } catch {
            Write-Host ""
            Write-Host "Git nie jest dostępny. Zainstaluj git z: https://git-scm.com/download/win" -ForegroundColor Red
            Write-Host ""
            Write-Host "LUB użyj GitHub Desktop i wykonaj:" -ForegroundColor Cyan
            Write-Host "  1. Otwórz GitHub Desktop" -ForegroundColor White
            Write-Host "  2. Dodaj wszystkie zmiany" -ForegroundColor White
            Write-Host "  3. Commit message: 'Migrate from JSON files to Vercel Blob storage'" -ForegroundColor White
            Write-Host "  4. Kliknij 'Push origin'" -ForegroundColor White
            exit 1
        }
    }
}

# Jeśli znaleziono git, wykonaj operacje
if ($gitCmd) {
    Write-Host ""
    Write-Host "Dodawanie zmian..." -ForegroundColor Yellow
    & $gitCmd add .
    
    Write-Host "Tworzenie commita..." -ForegroundColor Yellow
    & $gitCmd commit -m "Migrate from JSON files to Vercel Blob storage"
    
    Write-Host "Pushowanie do GitHub..." -ForegroundColor Yellow
    & $gitCmd push
    
    Write-Host ""
    Write-Host "Gotowe! Zmiany zostaly wyslane do GitHub." -ForegroundColor Green
    Write-Host "Vercel automatycznie wdrozy aktualizacje." -ForegroundColor Green
}


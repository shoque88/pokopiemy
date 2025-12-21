# Konfiguracja Git i GitHub - Rozwiązywanie problemów z autoryzacją

## Problem: "Password authentication is not supported"

GitHub **nie obsługuje już autoryzacji przez hasło**. Musisz użyć **Personal Access Token (PAT)**.

---

## Rozwiązanie 1: Personal Access Token (PAT) - Najprostsze

### Krok 1: Utwórz Personal Access Token

1. Przejdź do: https://github.com/settings/tokens
2. Kliknij **Generate new token** > **Generate new token (classic)**
3. Nadaj nazwę (np. "Pokopiemy Deployment")
4. Wybierz uprawnienia:
   - ✅ **repo** (pełny dostęp do repozytoriów)
   - ✅ **workflow** (opcjonalnie, jeśli używasz GitHub Actions)
5. Kliknij **Generate token**
6. **SKOPIUJ TOKEN** - będzie widoczny tylko raz!

### Krok 2: Użyj tokenu zamiast hasła

```bash
# Gdy Git poprosi o:
# Username: wpisz swoją nazwę użytkownika GitHub (np. shoque88)
# Password: wklej Personal Access Token (NIE hasło do konta!)
git push -u origin main
```

### Krok 3: Zapisz token w Git Credential Manager (opcjonalnie)

**Windows:**
```bash
# Token zostanie zapisany automatycznie w Windows Credential Manager
# Przy następnym push nie będziesz musiał go wpisywać
```

**Linux/WSL:**
```bash
# Zapisz token w Git credential helper
git config --global credential.helper store

# Przy następnym push token zostanie zapisany w ~/.git-credentials
```

---

## Rozwiązanie 2: SSH Keys (Zalecane dla długoterminowego użycia)

### Krok 1: Sprawdź czy masz klucz SSH

```bash
ls -al ~/.ssh
```

Jeśli widzisz pliki `id_rsa` i `id_rsa.pub` - masz już klucz.

### Krok 2: Utwórz nowy klucz SSH (jeśli nie masz)

```bash
ssh-keygen -t ed25519 -C "twoj-email@example.com"
# Naciśnij Enter dla domyślnej lokalizacji
# Opcjonalnie ustaw hasło
```

### Krok 3: Skopiuj klucz publiczny

```bash
# Windows (WSL)
cat ~/.ssh/id_ed25519.pub

# Skopiuj cały output (zaczyna się od ssh-ed25519)
```

### Krok 4: Dodaj klucz do GitHub

1. Przejdź do: https://github.com/settings/keys
2. Kliknij **New SSH key**
3. Nadaj tytuł (np. "My Computer")
4. Wklej skopiowany klucz publiczny
5. Kliknij **Add SSH key**

### Krok 5: Zmień remote na SSH

```bash
# Sprawdź aktualny remote
git remote -v

# Zmień na SSH (zastąp 'shoque88' swoją nazwą użytkownika)
git remote set-url origin git@github.com:shoque88/pokopiemy.git

# Sprawdź połączenie
ssh -T git@github.com
# Powinieneś zobaczyć: "Hi shoque88! You've successfully authenticated..."

# Teraz push nie będzie wymagał hasła
git push -u origin main
```

---

## Rozwiązanie 3: GitHub CLI (gh) - Najwygodniejsze

### Krok 1: Zainstaluj GitHub CLI

**Windows:**
```powershell
winget install GitHub.cli
```

**Linux/WSL:**
```bash
sudo apt update
sudo apt install gh
```

**macOS:**
```bash
brew install gh
```

### Krok 2: Zaloguj się

```bash
gh auth login
# Wybierz:
# - GitHub.com
# - HTTPS
# - Login with a web browser
# Postępuj zgodnie z instrukcjami
```

### Krok 3: Utwórz repozytorium i wdróż

```bash
# Utwórz repozytorium i wdróż w jednej komendzie
gh repo create pokopiemy --public --source=. --remote=origin --push
```

---

## Rozwiązanie 4: Użyj tokenu bezpośrednio w URL (niezalecane, ale działa)

```bash
# Zastąp TOKEN swoim Personal Access Token
# Zastąp USERNAME swoją nazwą użytkownika
git remote set-url origin https://TOKEN@github.com/USERNAME/pokopiemy.git

# Teraz push nie będzie wymagał podawania danych
git push -u origin main
```

**⚠️ UWAGA:** Token będzie widoczny w historii Git! Użyj tego tylko do testów.

---

## Problem: "Updates were rejected because the remote contains work"

Jeśli widzisz błąd:
```
! [rejected]        main -> main (fetch first)
error: failed to push some refs
```

To oznacza, że repozytorium na GitHub zawiera zmiany (np. README), których nie masz lokalnie.

### Rozwiązanie 1: Zintegruj zmiany (Rekomendowane)

```bash
# Pobierz zmiany z GitHub i zintegruj je
git pull origin main --allow-unrelated-histories

# Rozwiąż konflikty jeśli wystąpią (zwykle nie będzie konfliktów)
# Następnie push
git push -u origin main
```

### Rozwiązanie 2: Użyj rebase (Czystsze rozwiązanie)

```bash
# Pobierz zmiany i zastosuj rebase
git pull origin main --rebase --allow-unrelated-histories

# Jeśli wystąpią konflikty, rozwiąż je i kontynuuj:
# git add .
# git rebase --continue

# Następnie push
git push -u origin main
```

### Rozwiązanie 3: Nadpisz zdalne zmiany (Tylko jeśli jesteś pewien!)

**⚠️ UWAGA:** To usunie wszystkie zmiany na GitHub, które nie są w Twoim lokalnym repozytorium!

```bash
# Tylko jeśli chcesz całkowicie nadpisać repozytorium na GitHub
git push -u origin main --force
```

**Kiedy użyć --force:**
- ✅ Jeśli repozytorium na GitHub zawiera tylko automatycznie wygenerowany README
- ✅ Jeśli jesteś pewien, że chcesz nadpisać wszystkie zdalne zmiany
- ❌ NIE używaj jeśli na GitHub są ważne zmiany!

### Rozwiązanie 4: Sprawdź co jest na GitHub

```bash
# Zobacz co jest na zdalnym repozytorium
git fetch origin
git log origin/main

# Zobacz różnice
git diff main origin/main
```

---

## Sprawdzenie konfiguracji

```bash
# Sprawdź remote
git remote -v

# Sprawdź konfigurację Git
git config --list

# Sprawdź połączenie z GitHub (dla SSH)
ssh -T git@github.com
```

---

## Najczęstsze problemy

### Problem: "Permission denied (publickey)"

**Rozwiązanie:** Użyj Personal Access Token zamiast SSH, lub skonfiguruj SSH keys (patrz Rozwiązanie 2).

### Problem: "Repository not found"

**Rozwiązanie:** 
- Sprawdź czy repozytorium istnieje na GitHub
- Sprawdź czy masz uprawnienia do repozytorium
- Sprawdź czy nazwa użytkownika i nazwa repozytorium są poprawne

### Problem: Token wygasł

**Rozwiązanie:** Utwórz nowy Personal Access Token i użyj go zamiast starego.

---

## Rekomendacja

**Dla szybkiego wdrożenia:** Użyj **Personal Access Token (Rozwiązanie 1)**

**Dla długoterminowego użycia:** Skonfiguruj **SSH Keys (Rozwiązanie 2)**

**Dla największej wygody:** Użyj **GitHub CLI (Rozwiązanie 3)**

---

## Następne kroki

Po pomyślnym pushu do GitHub:
1. Przejdź do instrukcji wdrożenia na Vercel
2. Połącz repozytorium z Vercel
3. Wdróż aplikację


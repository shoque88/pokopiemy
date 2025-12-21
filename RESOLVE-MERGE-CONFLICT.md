# Rozwiązywanie konfliktu merge w README.md

## Szybkie rozwiązanie

Masz konflikt w pliku `README.md`. Oto jak go rozwiązać:

### Krok 1: Otwórz plik README.md

```bash
# W terminalu WSL
nano README.md
# lub
code README.md  # jeśli masz VS Code
```

### Krok 2: Znajdź konflikt

W pliku zobaczysz coś takiego:

```
<<<<<<< HEAD
[Tutaj jest Twoja lokalna wersja README.md]
=======
[Tutaj jest wersja z GitHub]
>>>>>>> origin/main
```

### Krok 3: Rozwiąż konflikt

**Opcja A: Zachowaj swoją wersję (Rekomendowane)**

Usuń wszystko od `<<<<<<< HEAD` do `>>>>>>> origin/main` i zostaw tylko swoją wersję.

**Opcja B: Zachowaj wersję z GitHub**

Usuń wszystko od `<<<<<<< HEAD` do `>>>>>>> origin/main` i zostaw tylko wersję z GitHub.

**Opcja C: Połącz obie wersje**

Zostaw to co chcesz zachować z obu wersji, usuń znaczniki konfliktu.

### Krok 4: Zapisz plik

- W nano: `Ctrl+X`, potem `Y`, potem `Enter`
- W vim: `Esc`, potem `:wq`, potem `Enter`
- W VS Code: `Ctrl+S`

### Krok 5: Zakończ merge

```bash
# Dodaj rozwiązany plik
git add README.md

# Zakończ merge
git commit

# Jeśli Git otworzy edytor, po prostu zapisz (Ctrl+X, Y, Enter w nano)
# Lub użyj:
git commit -m "Merge remote README.md"
```

### Krok 6: Push

```bash
git push -u origin main
```

---

## Szybkie rozwiązanie (jedna komenda)

Jeśli chcesz po prostu zachować swoją wersję README.md:

```bash
# Zachowaj swoją wersję
git checkout --ours README.md
git add README.md
git commit -m "Merge: zachowano lokalną wersję README.md"
git push -u origin main
```

Lub zachowaj wersję z GitHub:

```bash
# Zachowaj wersję z GitHub
git checkout --theirs README.md
git add README.md
git commit -m "Merge: zachowano wersję README.md z GitHub"
git push -u origin main
```

---

## Sprawdzenie statusu

```bash
# Zobacz status
git status

# Zobacz które pliki mają konflikty
git diff --name-only --diff-filter=U
```

---

## Jeśli masz wiele konfliktów

```bash
# Zobacz wszystkie pliki z konfliktami
git status

# Rozwiąż każdy plik osobno, następnie:
git add .
git commit -m "Rozwiązano konflikty merge"
git push -u origin main
```


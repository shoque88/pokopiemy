# Instrukcja: Aktualizacja numerów telefonów organizatorów w istniejących meczach

## Problem
Istniejące mecze mogą mieć zapisany tylko email organizatora (`organizer_email`), podczas gdy organizator ma telefon w profilu. Chcemy, aby te mecze używały telefonu z profilu organizatora.

## Rozwiązanie
Użyj skryptu SQL `UPDATE-ORGANIZER-PHONE.sql`, aby zaktualizować istniejące mecze.

## Krok 1: Otwórz Neon Dashboard
1. Przejdź do https://console.neon.tech
2. Zaloguj się do swojego projektu
3. Kliknij na projekt, w którym działa aplikacja

## Krok 2: Otwórz SQL Editor
1. W lewym menu kliknij "SQL Editor"
2. Kliknij "New query" lub wybierz istniejące zapytanie

## Krok 3: Wykonaj skrypt migracyjny
1. Otwórz plik `UPDATE-ORGANIZER-PHONE.sql` w edytorze
2. Skopiuj całą zawartość pliku
3. Wklej do SQL Editor w Neon Dashboard
4. Kliknij "Run" lub naciśnij Ctrl+Enter

## Krok 4: Sprawdź wyniki
Po wykonaniu skryptu zobaczysz listę meczów z ich danymi kontaktowymi organizatora. Sprawdź, czy:
- `organizer_phone` jest teraz wypełniony dla meczów, gdzie organizator ma telefon w profilu
- `user_phone` pokazuje telefon z profilu organizatora

## Co robi skrypt?
1. **Pierwsza aktualizacja**: Aktualizuje mecze, gdzie `organizer_phone` jest NULL lub pusty, a `organizer_email` jest wypełniony. Jeśli organizator (znaleziony po emailu) ma telefon w profilu, ustawia `organizer_phone` na telefon z profilu.

2. **Druga aktualizacja**: Aktualizuje mecze, gdzie `organizer_phone` jest już wypełniony, ale organizator ma inny telefon w profilu (np. zaktualizował telefon w profilu).

3. **Zapytanie sprawdzające**: Pokazuje wszystkie mecze z danymi kontaktowymi organizatora, aby można było zweryfikować wyniki.

## Uwagi
- Skrypt jest bezpieczny - aktualizuje tylko mecze, gdzie organizator ma telefon w profilu
- Nie usuwa istniejących danych - tylko uzupełnia brakujące telefony
- Możesz wykonać skrypt wielokrotnie - jest idempotentny (bezpieczny do wielokrotnego uruchomienia)

## Alternatywa: Automatyczna aktualizacja podczas pobierania meczu
Jeśli chcesz, aby mecze były automatycznie aktualizowane podczas ich pobierania (bez ręcznego uruchamiania skryptu), mogę dodać taką funkcjonalność do API. Daj znać, jeśli chcesz takiego rozwiązania.


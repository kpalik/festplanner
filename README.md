# Festplaner

Aplikacja webowa do planowania wyjazdów na festiwale muzyczne. Pozwala śledzić lineup, organizować wyjazdy grupowe, oceniać wykonawców i budować wspólny plan oglądania koncertów.

## Stack technologiczny

- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS v4, Framer Motion
- **Backend / baza danych**: Supabase (PostgreSQL + Row Level Security + Edge Functions)
- **Routing**: React Router v7
- **i18n**: i18next (PL, EN, CS)
- **PWA**: vite-plugin-pwa

## Główne funkcje

- Zarządzanie festiwalami i ich lineupem (sceny, godziny, wykonawcy)
- Widok timetable z podziałem na dni i sceny
- Baza wykonawców z profilami, ocenami i linkami do Spotify
- Tworzenie wyjazdów grupowych, zapraszanie uczestników przez e-mail
- Ocenianie wykonawców w skali interakcji (per wyjazd, opcjonalnie ukryte rankingi)
- Import lineupów z JSON

---

## Import lineupów (`LineupImporter`)

Komponent `src/components/Festivals/LineupImporter.tsx` umożliwia masowy import lub aktualizację występów dla danego festiwalu na podstawie danych JSON.

### Format wejściowy

Tablica obiektów JSON:

```json
[
  {
    "artist_name": "Band Name",
    "date": "2026-06-12",
    "start_time": "21:30",
    "end_time": "23:00",
    "stage_name": "Main Stage",
    "date_tbd": false,
    "origin_country": "US"
  }
]
```

| Pole | Typ | Opis |
|---|---|---|
| `artist_name` | string (wymagane) | Nazwa wykonawcy — używana do dopasowania z bazą |
| `date` | `YYYY-MM-DD` | Dzień festiwalowy (nie kalendarzowy — patrz sekcja Late Night) |
| `start_time` | `HH:MM` | Godzina rozpoczęcia |
| `end_time` | `HH:MM` | Godzina zakończenia (opcjonalne) |
| `stage_name` | string | Nazwa sceny — jeśli nie istnieje, zostanie utworzona |
| `date_tbd` | boolean | Jeśli `true`, data jest nieznana; domyślnie `true` gdy brak `date` |
| `origin_country` | string | Kraj pochodzenia — używany tylko przy tworzeniu nowego wykonawcy |

### Logika importu — krok po kroku

#### 1. Parsowanie i podgląd (`Preview Import`)

Przed zapisem importer analizuje JSON i dla każdego wpisu ustala:

- **Czy wykonawca istnieje** w tabeli `bands` (porównanie nazwy case-insensitive). Nowi oznaczeni są badge `NEW`.
- **Czy scena istnieje** w tabeli `stages` dla tego festiwalu. Nowe sceny zostaną utworzone przy imporcie.
- **Czy show już istnieje** w tabeli `shows` dla tego festiwalu i tego wykonawcy. Istniejące oznaczone są badge `UPDATE` — zostaną zaktualizowane, nie zduplikowane.

Na tym etapie **żadne dane nie są zapisywane**.

#### 2. Wykonanie importu (`Confirm & Import`)

Operacje wykonywane kolejno:

1. **Tworzenie nowych wykonawców** — tylko ci z badge `NEW`, deduplikacja po nazwie.
2. **Rozwiązanie ID wykonawców** — ponowne pobranie tabeli `bands` po ewentualnym dodaniu nowych.
3. **Tworzenie nowych scen** — tylko te, które nie istniały w festiwalu.
4. **Rozwiązanie ID scen** — ponowne pobranie tabeli `stages` po ewentualnym dodaniu nowych.
5. **Zapis shows** — podział na dwie grupy:
   - `INSERT` — nowe shows (wykonawca nie miał jeszcze show w tym festiwalu)
   - `UPDATE` — aktualizacja istniejącego show po jego `id` (dopasowanie: `festival_id` + `band_id`)

---

### Logika Late Night

Festiwale często mają shows po północy, które należą do poprzedniego dnia festiwalowego (np. show o 01:00 w środę jest częścią wtorkowego programu).

#### Konwencja w bazie danych

- Pole `start_time` (i `end_time`) przechowuje **rzeczywisty timestamp UTC** — czyli show o 01:00 w środę jest zapisany jako środa 01:00.
- Pole `is_late_night = true` sygnalizuje, że show należy do poprzedniego dnia festiwalowego.
- Przy wyświetlaniu aplikacja odejmuje 1 dzień od `start_time` gdy `is_late_night = true`, dzięki czemu show pojawia się pod właściwym dniem w timetable.

#### Logika importera

Pole `date` w JSON oznacza **dzień festiwalowy** (np. `"2026-06-09"` = wtorek), a `start_time` to godzina w tym dniu.

| Scenariusz | `date` w JSON | `start_time` | `is_late_night` | Timestamp w bazie | Wyświetlany pod |
|---|---|---|---|---|---|
| Normalny wieczór | wtorek | `22:00` | `false` | wtorek 22:00 | wtorek |
| Przekroczenie północy | wtorek | `23:00`, `end_time: 01:30` | `false` | wtorek 23:00 – środa 01:30 | wtorek |
| Late night | wtorek | `01:00` | `true` | środa 01:00 | wtorek |

**Reguły:**

- `is_late_night = true` gdy `start_time` mieści się w przedziale `00:00–05:59`. Importer automatycznie dodaje +1 dzień do timestampa, żeby kompensować odejmowanie przy wyświetlaniu.
- `end_time` przekraczające północ (gdy `end_time` < `start_time` na zegarze) jest automatycznie przesuwane o +1 dzień kalendarzowy — niezależnie od `is_late_night`.

---

## Supabase Edge Functions

### Setup & Deployment

Projekt korzysta z Supabase Edge Functions do obsługi logiki backendowej (m.in. wysyłanie zaproszeń mailowych przez Resend).

1. **Wymagania**: Zainstalowane `supabase` CLI lub `npx supabase`.

2. **Zmienne środowiskowe** — ustaw sekret w projekcie Supabase:
   ```bash
   npx supabase secrets set RESEND_API_KEY=twoj_klucz_api_resend
   ```

3. **Wdrożenie funkcji**:
   ```bash
   npx supabase functions deploy invite-user --no-verify-jwt
   ```
   Uruchom ponownie po każdej zmianie w `supabase/functions/invite-user/index.ts`.

---

## Database Backups

Zaleca się wykonywanie zrzutu bazy po każdej istotnej migracji.

1. **Wymagania**: [PostgreSQL Command Line Tools](https://www.postgresql.org/download/windows/) (`pg_dump`).
2. **Uruchomienie** (PowerShell):
   ```powershell
   .\scripts\backup_db.ps1
   ```
3. Skrypt poprosi o Connection String przy pierwszym uruchomieniu (Supabase Dashboard → Project Settings → Database → Connection string → URI → Mode: Session). Można go zapisać w `scripts/backup_config.json`.
4. Zrzuty `.sql` trafiają do folderu `dbdumps/` (dodany do `.gitignore`).

### Odtwarzanie

Użyj `psql` lub klienta SQL (DBeaver, pgAdmin) i wykonaj skrypt z `dbdumps/`.

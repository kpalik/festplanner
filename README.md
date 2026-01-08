# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Supabase Edge Functions

### Setup & Deployment

Ten projekt korzysta z Supabase Edge Functions do obsługi logiki backendowej, takiej jak wysyłanie zaproszeń mailowych.

1. **Wymagania**: Upewnij się, że masz zainstalowane `supabase` CLI lub używasz `npx supabase`.

2. **Zmienne środowiskowe**:
   Funkcja `invite-user` wymaga skonfigurowania klucza API do serwisu Resend.
   
   Ustaw sekret w swoim projekcie Supabase:
   ```bash
   npx supabase secrets set RESEND_API_KEY=twoj_klucz_api_resend
   ```

3. **Wdrożenie funkcji**:
   Przy pierwszej instalacji projektu oraz po każdej zmianie w pliku `supabase/functions/invite-user/index.ts`, musisz wdrożyć funkcję na środowisko zdalne:

   ```bash
   npx supabase functions deploy invite-user --no-verify-jwt
   ```

   > **Opcja `--no-verify-jwt`**: Flaga ta wyłącza weryfikację tokenu autoryzacyjnego (JWT). W przypadku funkcji `invite-user`, którą wywołują zalogowani użytkownicy (organizatorzy), **nie zalecamy** używania tej flagi. Jej brak (#bezpiecznie) sprawia, że Supabase automatycznie odrzuci próby wywołania funkcji przez niezalogowane osoby.

   Jeśli korzystasz z wielu projektów, Supabase poprosi Cię o wybranie odpowiedniego (lub możesz użyć flagi `--project-ref`).

### Aktualizacja funkcji

Gdy wprowadzasz zmiany w kodzie funkcji (np. zmiana szablonu maila, nowa logika):
1. Edytuj plik `supabase/functions/invite-user/index.ts`.
2. Uruchom polecenie wdrożenia:
   ```bash
   npx supabase functions deploy invite-user --no-verify-jwt
   ```
   Bez tego kroku, Supabase będzie nadal używać starej wersji funkcji.

## Database Backups

Aby wykonać backup bazy danych Supabase (wersja Free) na lokalny komputer:

1. **Wymagania**: Zainstaluj [PostgreSQL Command Line Tools](https://www.postgresql.org/download/windows/) (pg_dump).
2. **Uruchomienie**:
   Otwórz PowerShell w folderze projektu i uruchom:
   `powershell
   .\scripts\backup_db.ps1
   ` 
3. **Konfiguracja**:
   Skrypt poprosi o Connection String przy pierwszym uruchomieniu (znajdziesz go w Supabase Dashboard -> Project Settings -> Database -> Connection string -> URI, Mode: Session).
   Możesz zapisać go w pliku scripts/backup_config.json, aby nie wpisywać go za każdym razem.
   
   Alternatywnie, możesz ustawić zmienną środowiskową SUPABASE_DB_URL:
   `powershell
    = "postgres://postgres..."
   ` 

Backupy są zapisywane w folderze ackups/ z datą w nazwie pliku. Folder ten jest ignorowany przez git.

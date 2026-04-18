# Family Board

A household chore tracker built with SvelteKit and SQLite. Family members pick their name, tap chores to mark them done, and the board automatically resets each chore on its schedule.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | [SvelteKit](https://kit.svelte.dev) (Svelte 5 runes mode) |
| Database | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| Image processing | [sharp](https://sharp.pixelplumbing.com) |
| Testing | [Vitest](https://vitest.dev) |
| Formatting | Prettier + ESLint |

## Getting Started

```bash
# Install dependencies
yarn install

# Start the dev server (port 5200)
yarn dev

# Run tests
yarn test
```

The SQLite database is created automatically at `data/family_board.db` on first run. The `data/` directory is gitignored.

## Project Structure

```
src/
├── lib/
│   ├── chore-logic.js          # Pure functions: isDueAgain, categorizeChores
│   ├── colors.js               # 16-colour pastel theme system
│   └── server/
│       ├── db.js               # SQLite setup + named exports for routes
│       ├── schema.js           # SQL schema + runMigrations()
│       ├── images.js           # Chore image upload/delete (sharp)
│       ├── db.test.js          # Integration + unit tests
│       └── queries/
│           ├── chores.js       # Chore CRUD + getChoresWithStatus
│           ├── family.js       # Family member CRUD
│           └── completions.js  # completeChore + getStats
└── routes/
    ├── +layout.svelte          # Sidebar nav, CSS theme vars
    ├── +layout.server.js       # Load family + current member cookie
    ├── +page.svelte            # Main chore grid
    ├── +page.server.js         # complete / selectMember actions
    ├── stats/                  # Stats page
    ├── manage-chores/          # Chore CRUD (with image upload)
    └── manage-family/          # Family member CRUD + colour picker
```

## Database Schema

```sql
family            (id, name, color)
chores            (id, name, frequency, suggested_day, image)
chores_completed  (id, chore_id → chores, completed_by → family, completed_at)
```

`chores_completed` stores only the foreign key to `family` — name and colour are always joined at query time so changes to a family member's profile are reflected everywhere immediately.

### Frequencies

`none` · `daily` · `weekly` · `monthly` · `yearly`

A chore reappears as due once its frequency window rolls over. `none` chores are one-time tasks that disappear after completion (shown in "Recently Completed" for 2 days).

## Feature Overview

### Main Page

- Chore tiles are neutral gray when due; the frequency appears as a coloured bubble.
- Clicking a tile marks it complete for the selected family member.
- If no member is selected the app prompts "Who dis?" before recording the completion.
- Completed chores are tinted with the completer's personal colour and move to the bottom of the grid.

### Colour Theming

Each family member picks one of 16 pastel hues on the Manage Family page. That hue drives:
- The left sidebar background and active-link colour
- The "Who dis?" dropdown when that member is selected
- The tint of completed chore tiles

All derived colours (nav bg, border, text, light background) are computed from the hue in `src/lib/colors.js` via `buildCssVars(hue)`, applied as CSS custom properties on the root layout element.

### Chore Images

Images uploaded on the Manage Chores page are automatically center-cropped and resized to **150 × 150 px WebP** by `sharp` before being saved to `static/store/images/chores/`. Old images are deleted when replaced or when the chore is deleted.

## Testing

Tests live in `src/lib/server/db.test.js` and are split into three layers:

1. **Pure logic** (`isDueAgain`, `categorizeChores`) — no database, just date arithmetic.
2. **Categorization** (`categorizeChores`) — verifies the due/completed/hidden bucketing rules against fixture rows.
3. **Integration** — spins up a real in-memory SQLite database via `createDb(new Database(':memory:'))` and exercises the full read/write cycle.

```bash
yarn test          # run once
yarn test:unit     # watch mode
```

Adding a new test that needs a database:

```js
import Database from 'better-sqlite3';
import { createDb } from '$lib/server/db.js';
import { addChore, getChoresWithStatus } from '$lib/server/queries/chores.js';

const db = createDb(new Database(':memory:'));
const { lastInsertRowid: id } = addChore(db, 'My chore', 'weekly', null, null);
```

## Dev Notes

- **Port** — dev server is pinned to `5200` in `vite.config.js` (`strictPort: true`). Use `5201` for any ad-hoc testing so the two don't collide.
- **Migrations** — `runMigrations()` in `schema.js` uses `PRAGMA table_info` checks so it is safe to run on existing databases.
- **No ORM** — queries are plain SQL in the `queries/` modules. Each function takes a `db` (better-sqlite3 instance) as its first argument, which is what makes them independently testable.
- **Cookie** — the selected family member is stored in a `member_id` cookie (1-year expiry). The layout server load reads it and passes `currentMember` down to every page via SvelteKit's data cascade.

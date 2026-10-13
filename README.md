# PlayHere Web

The PlayHere web app: a multi-sport platform for scoring local matches live, running tournaments, managing teams and keeping a player profile. Built with React, Vite, TypeScript and pnpm.

| Package | What it is |
| --- | --- |
| `apps/web` | The web app: sign-in, quick matches, live scoring for 12 sports, tournaments, teams, rankings, profile and settings |
| `packages/brand` | Shared colour tokens, logo and avatar colours |

It talks to the PlayHere backend through the API gateway.

## Requirements

- Node 20+ (Vite 6 is used because Node 20.12 is below Vite 7's minimum; upgrade Node to 20.19+ to move up)
- pnpm 10 (`npm i -g pnpm@10`)
- The PlayHere backend gateway running (default `http://localhost:8080`)

## Run

```bash
pnpm install
pnpm dev            # web app → http://localhost:5173
pnpm typecheck      # all packages
pnpm build          # production build in apps/web/dist
```

## Configuration

Copy `apps/web/.env.example` to `apps/web/.env.local` and set:

- `VITE_API_URL`: the gateway API, default `http://localhost:8080/api/v1`
- `VITE_WS_URL`: live scores over STOMP, default `ws://localhost:8080/ws/stomp`

## Structure (`apps/web/src`)

```
app/          router (lazy-loaded pages, auth guard), shell (sidebar, top bar with search, phone tab bar), Start menu
lib/          api client (bearer token + single-flight refresh), session, STOMP live scores, formatting, theme
domain/       API response types, the sport catalogue, match logic (results, chase maths, periods, overs)
data/         one module per domain: typed fetchers + TanStack Query hooks
components/   UI kit (ui, forms, overlay, sport pickers) and match/tournament/team cards
features/     pages grouped by area: auth, home, matches, tournaments, teams, players, me, search, more
styles/       global design system CSS (imports the shared brand tokens)
```

Conventions:

- Pages never call `fetch` directly; they use hooks from `data/`. Every error is an `ApiError` with a message safe to show.
- User-specific queries include the user id in their query key, so they reset on sign-in and sign-out.
- What you can do comes from context (team captain, tournament organiser, match scorer), not a role picker.
- The sport list in `domain/sports.ts` mirrors the backend's `Sport` enum; keep them in sync.
- Tokens are kept in `localStorage`. That is standard for an SPA without cookie auth, but it means any XSS could read them, so keep third-party scripts out of the app.

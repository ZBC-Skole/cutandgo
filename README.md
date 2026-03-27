# Cut&Go

Mobil bookingplatform til frisørsaloner bygget med Expo, Convex og Better Auth.

## Tech Stack

- Expo + React Native + TypeScript
- Convex (database, functions, HTTP routes)
- Better Auth via `@convex-dev/better-auth`
- NativeWind

## Krav

- Node.js 20+
- npm, pnpm eller bun
- Expo CLI (kører via `npx expo ...`)
- Convex CLI (kører via `npx convex ...`)

## 1) Installation

```bash
# vælg én pakkehåndtering
npm install
# eller
pnpm install
# eller
bun install
```

## 2) Første opsætning (Convex + Auth)

### 2.1 Start Convex dev én gang

```bash
npx convex dev
```

Det opretter/opfanger `.env.local` med mindst:

- `CONVEX_DEPLOYMENT`
- `EXPO_PUBLIC_CONVEX_URL`

### 2.2 Sæt nødvendige Convex env vars

Kør disse kommandoer (justér URLs efter dit miljø):

```bash
npx convex env set BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
npx convex env set BETTER_AUTH_URL="http://127.0.0.1:3211"
npx convex env set SITE_URL="http://localhost:8081"
```

- `BETTER_AUTH_URL`: base URL til Better Auth backend (Convex `.site` i cloud, `127.0.0.1:3211` lokalt).
- `SITE_URL`: web app-origin (bruges til cross-domain flow på web).

### 2.3 `.env.local` i appen

Sørg for at `.env.local` indeholder (eksempel lokalt):

```env
CONVEX_DEPLOYMENT=local:your-project

EXPO_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
EXPO_PUBLIC_CONVEX_SITE_URL=http://127.0.0.1:3211
EXPO_PUBLIC_SITE_URL=http://localhost:8081
```

## 3) Kør projektet

Kør i to terminaler:

Terminal 1:

```bash
npx convex dev
```

Terminal 2:

```bash
npx expo start
```

Valgfrit:

```bash
npx expo start --ios
npx expo start --android
npx expo start --web
```

## 4) Auth-arkitektur (kort)

- Server:
  - `convex/auth.ts` (Better Auth instance + plugins)
  - `convex/auth.config.ts` (Convex auth provider)
  - `convex/http.ts` (registerer `/api/auth/*` routes)
- Client:
  - `src/lib/auth-client.ts`
  - Native: `expoClient(...)`
  - Web: `crossDomainClient(...)`

## 5) Vigtige scripts

- `npm run start` / `pnpm start` / `bun run start`
- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run lint`

## 6) Typiske auth-problemer

### Login lykkes ikke (forbliver unauthenticated)

Tjek i rækkefølge:

1. `npx convex env list` indeholder `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `SITE_URL`.
2. `EXPO_PUBLIC_CONVEX_SITE_URL` peger på samme backend (`.site` / `:3211`) som Better Auth routes.
3. App-scheme i `app.json` er sat (`"scheme": "cutandgo"`).
4. Genstart både Convex og Expo efter env/config ændringer.
5. Hard reload app/web (ryd evt. local storage / app data).

### Warning: “Base URL could not be determined”

Sæt `BETTER_AUTH_URL` via:

```bash
npx convex env set BETTER_AUTH_URL="http://127.0.0.1:3211"
```

og genstart `npx convex dev`.

## 7) Projektstruktur

```text
src/       UI, screens, hooks, feature-moduler
convex/    backend-domæner, auth, schema, http
assets/    billeder og statiske filer
```

## 8) Dagligt workflow

1. `npx convex dev`
2. `npx expo start`
3. Udvikl feature
4. Kør `npm run lint` (eller tilsvarende)
5. Commit

---

Hold koden enkel, læsbar og feature-opdelt.

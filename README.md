# Cut&Go

En mobil bookingplatform til frisørsaloner.

## Stack
- Expo + React Native + TypeScript
- Convex (backend, database, auth-nær logik)
- NativeWind (styling)

## Quick Start
```bash
pnpm install
pnpm expo start
```

Alternativt kan du bruge `npm` eller `bun`.

## Environment
Opret `.env.local` med dine Convex/Expo værdier.

Typisk udviklingsflow:
```bash
npx convex dev
pnpm expo start
```

## Scripts
- `pnpm expo start` - start dev server
- `pnpm expo ios` - kør i iOS simulator
- `pnpm expo android` - kør i Android emulator
- `pnpm expo web` - kør web build
- `pnpm expo lint` - lint projektet

## Struktur
```text
src/       UI, screens, hooks, feature-moduler
convex/    Queries, mutations, schema og backend-logik
assets/    Billeder, ikoner og statiske filer
```

## Fokus i projektet
- Bookinger og rescheduling
- Fravær/sygemelding for medarbejdere
- Admin KPI og drifts-overblik

---
Hold koden enkel, læsbar og feature-opdelt.

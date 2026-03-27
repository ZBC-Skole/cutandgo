# Backend Architecture

Convex backend is organized by domain with predictable entrypoints.

## Structure

- `auth/`: Better Auth setup and integration.
- `security/`: Authorization helpers (`authz`).
- `http/`: HTTP router registration.
- `schema/`: Convex schema definition.
- `domains/`: Business logic grouped by bounded context.

Each domain exposes a stable `index.ts` for public exports.
Large domains are split into:

- `queries.ts`: read-only Convex queries
- `mutations.ts`: write operations
- `shared.ts`: internal helpers/constants used by queries and mutations

## API paths

Frontend references Convex functions through backend module paths, for example:

- `api["backend/bookings"].createBooking`
- `api["backend/staff"].listEmployeesWithAssignments`

# Local mock mode implementation log

## Stage 1: shared seed and session foundation

Added `lib/mock-data/` with six role profiles, thirteen branches, seed menu and rider records, a shared process-level mutable state, deterministic paid order IDs beginning at `SL-4208`, and a reset function. Enabled mock session POST/GET/DELETE when sandbox and mock flags are set outside production. Middleware can route mock staff cookies without contacting Supabase and injects the mock headers. The mock order endpoint now creates an order without Supabase or PostGIS.

## Enable locally

Set `NEXT_PUBLIC_ENABLE_SANDBOX=true` and `NEXT_PUBLIC_USE_MOCK_DATA=true` in `.env.local`, then restart `npm run dev`. Mock auth is deliberately disabled in production.

## Stage 2: admin workflows and tracking

Connected orders, KDS status actions, rider assignment, rider enroute actions, stock, menu prices, geofence radius, POS creation, courier simulation, revenue, tracking, QR handover, and reset to the shared mock state. KDS and dispatch now refresh that state locally in mock mode instead of subscribing to Supabase. The toolbar can create and open a mock order, switch into every staff role, and reset state. The login page provides the same role selector and AdminChrome shows the mock-mode banner.

## Stage 3: verification record

`npx tsc --noEmit` completed successfully. A source audit found no raw emoji or em dash characters. The workspace already had a Next development server running on port 3000, so it needs a restart to load the newly added mock-data environment variable. After restart, create a mock order from Dev tools, then move it through KDS, Dispatch, Rider, and Tracking. Reset returns the shared process state to its seed records.

## Stage 4: client route review

Reviewed the affected client components against the React quality checklist. Mock mode uses API polling only for the views that need shared server state, while the existing Supabase subscriptions remain behind real-mode guards. Login and toolbar role switching now set the server-managed mock cookie through the session endpoint, which keeps the browser, middleware, and AdminChrome aligned.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- The product is **NeuroSys**, a clinical ERP (Next.js 16 App Router + React 19 + Tailwind v4 + Supabase). All app code lives in the `neurosys/` subdirectory, not the repo root — run every `npm` command from `neurosys/`. Standard scripts live in `neurosys/package.json` / `neurosys/README.md` (`npm run dev`, `npm run build`, `npm run lint`). Node 20+ is required (verified on Node 22).
- The repo root `main` branch is effectively empty (README only); the actual application ships on feature branches. Base setup/dev work on the branch that contains the `neurosys/` app.
- **Supabase is optional.** With no `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set, the app runs in "Modo demostrativo" using static data from `src/lib/demo-data.ts`, so `npm run dev` works standalone with no external services or env vars. This is the fastest way to run and demo the UI.
- Persistence features (login, onboarding, real patient/agenda writes via the server actions in `src/app/**/actions.ts`) require a Supabase project. Copy `neurosys/.env.example` to `neurosys/.env.local` and fill in the keys; migrations live in `neurosys/supabase/`. Never use the `service_role` key in the frontend.
- **Local full stack (with persistence):** the Supabase CLI and Docker are not preinstalled. Run local Supabase with `npx supabase start` from `neurosys/` (needs Docker; on this VM the daemon must be started manually and the socket made accessible). It applies the migration automatically and prints the API URL (`http://127.0.0.1:54321`), publishable key, and Studio (`http://127.0.0.1:54323`). Put the API URL + publishable key in `.env.local`, then restart `npm run dev` so Next reloads env. The app has no signup UI — create the first auth user via the GoTrue admin API / Studio (email pre-confirmed since `enable_confirmations = false`), then log in.
- **First-run flow with Supabase:** a freshly created user has no organization, so `/` redirects to `/onboarding`, which calls the `bootstrap_organization` RPC to create the org + first branch + admin membership. Only after that do patient writes succeed (the `patients` insert requires an active membership with a `branch_id`). The Pacientes page shows a "Datos conectados" badge when Supabase is wired up, "Modo demostrativo" otherwise.
- Dev server serves on port `3000`. `npm run lint` runs `eslint` with no args (config in `eslint.config.mjs`).

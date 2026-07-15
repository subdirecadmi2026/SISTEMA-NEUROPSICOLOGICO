<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- The product is **NeuroSys**, a clinical ERP (Next.js 16 App Router + React 19 + Tailwind v4 + Supabase). All app code lives in the `neurosys/` subdirectory, not the repo root — run every `npm` command from `neurosys/`. Standard scripts live in `neurosys/package.json` / `neurosys/README.md` (`npm run dev`, `npm run build`, `npm run lint`). Node 20+ is required (verified on Node 22).
- The repo root `main` branch is effectively empty (README only); the actual application ships on feature branches. Base setup/dev work on the branch that contains the `neurosys/` app.
- **Supabase is optional.** With no `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set, the app runs in "Modo demostrativo" using static data from `src/lib/demo-data.ts`, so `npm run dev` works standalone with no external services or env vars. This is the fastest way to run and demo the UI.
- Persistence features (login, onboarding, real patient/agenda writes via the server actions in `src/app/**/actions.ts`) require a Supabase project. Copy `neurosys/.env.example` to `neurosys/.env.local` and fill in the keys; migrations live in `neurosys/supabase/`. The Supabase CLI is not preinstalled. Never use the `service_role` key in the frontend.
- Dev server serves on port `3000`. `npm run lint` runs `eslint` with no args (config in `eslint.config.mjs`).

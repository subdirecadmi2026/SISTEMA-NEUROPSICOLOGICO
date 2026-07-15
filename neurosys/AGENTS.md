<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- This repo is a single **Next.js 16 (App Router) + React 19 + Tailwind v4** frontend MVP. All application code lives in the `neurosys/` subdirectory, not the repo root — run all `npm` commands from there. Standard scripts are in `neurosys/package.json` / `neurosys/README.md` (`npm run dev`, `npm run build`, `npm run lint`).
- There is **no backend, database, or auth** yet; all data is static demo content in `src/lib/demo-data.ts`, so the dev server runs standalone with no external services or env vars.
- Dev server: `npm run dev` in `neurosys/` serves on port `3000`. Build uses Turbopack.
- `npm run lint` runs `eslint` with no arguments (config in `eslint.config.mjs`).

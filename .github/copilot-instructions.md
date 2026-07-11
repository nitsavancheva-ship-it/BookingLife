# Copilot Instructions — BookingLife

BookingLife is an Airbnb-style property booking platform built for the SoftUni "Software Technologies with AI" capstone.

## Hard constraints
- No TypeScript. No React, Vue, or any UI framework. Vanilla JS + HTML + CSS + Bootstrap 5 only.
- No custom backend server. All data access goes through Supabase (Postgres + Auth + Storage) via `@supabase/supabase-js`.
- Multi-page app: every screen is its own `.html` file at the project root, not a client-side route.

## File organization
- `src/js/services/*.js` — the ONLY files that call `supabase.from(...)` or `supabase.storage`. No UI code here.
- `src/js/pages/*.js` — one per screen, owns DOM wiring for that screen, calls services/components. No direct Supabase calls.
- `src/js/components/*.js` — reusable render functions (navbar, property card), shared across pages.
- `src/js/utils/*.js` — pure functions only (date math, validation, toasts). No Supabase calls, minimal DOM coupling.
- `src/js/auth.js` — session/role helpers (`requireAuth`, `requireRole`, `getCurrentUser`, `getCurrentRole`, `logout`).

## Adding a new screen
1. Create `new-page.html` at the project root, following the existing skeleton (`<div id="navbar"></div>` + `<main>` + `<script type="module" src="/src/js/pages/newPage.js">`).
2. Create `src/js/pages/newPage.js`.
3. Register the new HTML file in `vite.config.js`'s `build.rollupOptions.input` — otherwise it silently won't be included in the production build (it still works in `npm run dev`, which is the trap).
4. Add a navbar link in `src/js/components/navbar.js` if the page should be reachable from navigation.

## Security
- Row-Level Security (RLS) is the real authorization boundary. Every table has RLS enabled.
- Client-side guards (`requireAuth`, `requireRole`) are UX only — they prevent a flash of protected content, but are never the only check. Any new table or policy must enforce access control in Postgres, not just in a page script.
- Never expose the Supabase service-role key to the client. Only the anon key belongs in `.env` / `import.meta.env`.

## Database changes
- Always add a new file under `supabase/migrations/` for schema changes (`npx supabase migration new <name>`). Never edit the schema directly in the Supabase dashboard — the local `supabase/migrations/` folder must stay the source of truth.

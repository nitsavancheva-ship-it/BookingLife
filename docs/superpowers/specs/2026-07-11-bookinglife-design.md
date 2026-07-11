# BookingLife — Design Spec

**Author:** nitsavancheva-ship-it
**GitHub Repo:** BookingLife (owner: nitsavancheva-ship-it) — already exists
**Timeline:** July 11 – July 14, 2026 (4 days)
**Course:** SoftUni "Software Technologies with AI" — Capstone Project

## 1. Overview

BookingLife is an Airbnb-style property booking platform. Any registered user can browse and book properties as a guest, and can also list their own properties as a host — there is no separate "host" role, just users who own listings. Admins moderate the whole platform: users, properties, and bookings.

**Roles:**
- **Guest actions** (any signed-in user): browse, book properties, leave reviews after a completed stay, manage own bookings.
- **Host actions** (any signed-in user, on their own listings): create/edit/delete properties, upload photos, view bookings received.
- **Admin** (`user_roles.role = 'admin'`): everything a user can do, plus manage all users (promote/demote, activate/deactivate), manage all properties (edit/delete any), manage all bookings (view/cancel any), and view site-wide stats.

Browsing and viewing property details is public (no login required). Booking, hosting, reviewing, and admin actions require authentication; admin actions additionally require the `admin` role.

## 2. Architecture & Tech Stack

- **Frontend:** Vanilla JS + HTML + CSS, Bootstrap 5 (npm package) for styling/components, Bootstrap Icons for iconography, Leaflet + OpenStreetMap tiles for maps (no API key required).
- **Build tool:** Vite configured as a **multi-page app** — each screen is its own `.html` entry point at the project root, each importing its own JS module via `<script type="module">`. All entries must be listed in `vite.config.js`'s `build.rollupOptions.input`, or they won't be included in the production build (they still work in `npm run dev`, which serves any `.html` file automatically — this is a real gotcha to verify before deployment).
- **Backend:** Supabase (Postgres DB, Auth, Storage). No custom server — the frontend talks to Supabase's REST/Auth/Storage APIs directly via `@supabase/supabase-js`; Row-Level Security (RLS) is the authorization layer.

**Shared code layout:**
```
src/js/supabaseClient.js       - single Supabase client instance
src/js/auth.js                 - getCurrentUser(), requireAuth(), requireRole('admin'), logout()
src/js/services/
  properties.js, bookings.js, reviews.js, photos.js, profiles.js, roles.js
                                - thin wrappers around Supabase queries, no UI code
src/js/components/
  navbar.js                    - renders shared navbar into <div id="navbar">, adjusts links by session/role
  propertyCard.js               - reusable property card renderer (used on Browse + My Properties)
src/js/pages/
  browse.js, login.js, register.js, property.js, propertyEdit.js,
  myBookings.js, myProperties.js, profile.js, admin.js
                                - one per screen, owns that page's DOM wiring
src/js/utils/
  dates.js                     - night count / price calculation, date formatting
  validators.js                - form validation helpers (pure functions, no DOM)
```

**Pages (9 HTML entries at project root):**
`index.html`, `login.html`, `register.html`, `property.html`, `property-edit.html`, `my-bookings.html`, `my-properties.html`, `profile.html`, `admin.html`, plus `404.html` as a static fallback.

**Shared navbar** (rendered into every page): logo/home link always. Signed out → Login, Register. Signed in → Browse, My Bookings, My Properties, Profile, Logout, plus Admin (only if `role === 'admin'`). Built with Bootstrap's responsive navbar, collapsing to a hamburger menu on mobile.

## 3. Pages/Screens

1. **`index.html` — Browse (public)**: Leaflet map (all property pins) beside a scrollable list of property cards (cover photo, title, city, price/night, avg. rating). Filter bar: city select, price-range inputs, guest-count input — filtering re-queries Supabase and updates both list and map. Loading spinner while fetching; "No properties match your filters" empty state. Clicking a pin or card goes to `property.html?id=`.

2. **`login.html` / `register.html` (public)**: Bootstrap card-centered forms with inline validation (`is-invalid` classes + messages). Register collects email, password, display name; on success a DB trigger creates `profiles`/`user_roles` rows automatically, then redirects to `index.html`. Login honors `?redirect=<page>` (set when an unauthenticated user was bounced from a protected page), else redirects to `index.html`.

3. **`property.html?id=` (public)**: Bootstrap carousel gallery (cover photo first), full details (description, amenities as badges, bed/bath/guest icons, host name/avatar), a Leaflet map centered on the property, and the reviews list (star rating + comment + reviewer name). Booking widget (date-range inputs, live night/price calculation, "Book now") shows only when signed in; signed-out visitors see a **"Log in to book"** prompt linking to `login.html?redirect=property.html?id=<id>`. Submitting a booking inserts into `bookings`; a caught DB exclusion-constraint violation (overlapping dates) surfaces as a toast, not a generic error.

4. **`property-edit.html` (protected, `requireAuth`)**: handles both create (no `?id=`) and edit (`?id=` present; guard also checks the signed-in user is the owner or admin, else redirect). Fields: title, description, city, address, price, guests, bedrooms, bathrooms, amenities (checkboxes from a fixed list: WiFi, Kitchen, Free Parking, Pool, Air Conditioning, Washer, TV, Pet Friendly), a Leaflet click-to-place-marker map for lat/long, and a multi-file photo uploader with a "set as cover" toggle per thumbnail.

5. **`my-bookings.html` (protected)**: signed-in user's bookings as cards (property thumbnail/title, dates, total price, status) with a Cancel button (`status='cancelled'`) and, once `check_out` has passed with no existing review, a "Leave a review" button opening a rating+comment modal.

6. **`my-properties.html` (protected, host dashboard)**: properties the signed-in user owns, with edit/delete links to `property-edit.html` and an expandable list of bookings received per property (read-only — bookings are instantly confirmed, no approval step).

7. **`profile.html` (protected)**: edit display name/bio, upload/replace avatar (`avatars` bucket → `profiles.avatar_url`), change password (via Supabase Auth, while logged in — no email-based reset flow), role badge display.

8. **`admin.html` (protected, `requireRole('admin')`)**: stats row (total users/properties/bookings/reviews as cards) plus three Bootstrap nav-tabs: **Users** (table, role toggle, activate/deactivate toggle), **Properties** (table, view/delete any), **Bookings** (table, view/cancel any). Admin mutations go through the same service functions as owner-facing pages — RLS permits them because the caller is an admin, not because the UI takes a different code path.

**Cross-cutting UX**: Bootstrap grid + collapsible navbar for responsive desktop/mobile layouts (map/list and gallery/details splits stack vertically below `md`); loading spinners during async fetches; empty states with icons; success/error toasts on every mutation (booking, save, cancel, review, role change); subtle hover/shadow lift on property cards.

## 4. Database Schema

Six tables in `public`, all RLS-enabled.

**`profiles`** (extends `auth.users` 1:1)
`id uuid PK references auth.users(id) on delete cascade`, `display_name text`, `avatar_url text`, `bio text`, `is_active boolean default true`, `created_at timestamptz default now()`
RLS: `select` open to everyone; `update` own row only, or any row if admin.

**`user_roles`** (RBAC)
`user_id uuid PK references auth.users(id) on delete cascade`, `role text not null default 'user' check (role in ('user','admin'))`
RLS: `select` own row, or any row if admin; `update`/`insert` admin only.
A trigger `handle_new_user` (`after insert on auth.users`) creates the matching `profiles` and `user_roles` (`role='user'`) rows automatically — every authenticated user always has both.

**`properties`** (listings; owner = host)
`id uuid PK default gen_random_uuid()`, `owner_id uuid references auth.users(id) on delete cascade`, `title text not null`, `description text`, `city text not null`, `address text`, `latitude double precision not null`, `longitude double precision not null`, `price_per_night numeric(10,2) not null check (price_per_night > 0)`, `max_guests int not null default 1 check (max_guests > 0)`, `bedrooms int default 1`, `bathrooms int default 1`, `amenities text[]`, `created_at`, `updated_at`
Indexes: `city`, `owner_id`, `price_per_night`.
RLS: `select` open to everyone (public browsing); `insert` requires `auth.uid() = owner_id` and an active profile; `update`/`delete` owner or admin.
Note: `amenities` is a Postgres array rather than a junction table — deliberate, since there's no amenity-based filtering in scope and a fixed tag-like list doesn't need full 3NF treatment (YAGNI).

**`property_photos`** (1:many with properties)
`id uuid PK`, `property_id uuid references properties(id) on delete cascade`, `storage_path text not null`, `display_order int default 0`, `is_cover boolean default false`
Index: `property_id`. Partial unique index: `(property_id) WHERE is_cover` — DB-enforced guarantee of at most one cover photo per property.
RLS: `select` open to everyone; `insert`/`update`/`delete` the parent property's owner or admin (via subquery on `properties.owner_id`).

**`bookings`** (guest reservations)
`id uuid PK`, `property_id uuid references properties(id) on delete cascade`, `guest_id uuid references auth.users(id) on delete cascade`, `check_in date not null`, `check_out date not null check (check_out > check_in)`, `total_price numeric(10,2) not null`, `status text not null default 'confirmed' check (status in ('confirmed','cancelled'))`, `created_at`
`total_price` is stored (not derived from `price_per_night × nights`) so a later rate change never alters a historical booking's price — the standard "snapshot at transaction time" pattern.
A Postgres **exclusion constraint** (`btree_gist` extension) is the authoritative double-booking guard: `EXCLUDE USING gist (property_id WITH =, daterange(check_in, check_out) WITH &&) WHERE (status = 'confirmed')`.
Indexes: `property_id`, `guest_id`.
RLS: `select` the guest, the property's owner, or admin; `insert` requires `auth.uid() = guest_id` and an active profile; `update` (cancel) the guest, property owner, or admin.

**`reviews`** (post-stay feedback)
`id uuid PK`, `property_id uuid references properties(id) on delete cascade`, `guest_id uuid references auth.users(id) on delete cascade`, `booking_id uuid references bookings(id) on delete cascade unique`, `rating int not null check (rating between 1 and 5)`, `comment text`, `created_at`
Indexes: `property_id`, `guest_id`.
RLS: `select` open to everyone; `insert` requires the booking to belong to `auth.uid()`, be `confirmed`, and have `check_out < current_date` (both `date` columns, compared directly — no timestamp cast needed); `update`/`delete` the review's author or admin.
Average rating (shown on Browse cards and the property detail header) is computed client-side by aggregating each property's already-fetched reviews array — no DB view needed at this scale.

**Relationships summary**: `properties.owner_id → auth.users`; `property_photos.property_id → properties`; `bookings.property_id → properties`, `bookings.guest_id → auth.users`; `reviews.booking_id → bookings` (unique), `reviews.property_id → properties`, `reviews.guest_id → auth.users`. All child tables cascade on delete from their parent.

**Migration workflow**: CLI-first. `supabase init` once, then every schema change is `supabase migration new <name>` → hand-written SQL → `supabase db push` against the linked remote project. `supabase/migrations/*.sql` is the source of truth by construction (never edited via dashboard first) and is committed to the repo with each schema-affecting task.

## 5. Storage & Auth

**Storage — two public-read buckets:**
- `avatars` — path `{user_id}/{filename}`; a user manages only their own prefix, admins manage any.
- `property-photos` — path `{property_id}/{filename}`; the property's owner manages its prefix, admins manage any.

Upload flow: client uploads directly via `supabase.storage.from(bucket).upload(...)`, then writes the resulting path into `profiles.avatar_url` or a new `property_photos` row; display via `getPublicUrl()`. Client-side validation caps file type to `image/*` and size to 5MB.

**Auth — Supabase Auth, email/password:**
- **Disable "Confirm email" in Supabase Auth settings** so registration is instant — required for the demo credentials to work immediately, and better UX generally. This is a one-time project-settings change, done in the Day 1 setup task.
- Session state via `supabase.auth.getSession()`, persisted by supabase-js in `localStorage`. supabase-js attaches the session JWT as the `Authorization` header on every request; Postgres RLS reads the caller's identity via `auth.uid()`, extracted from that JWT's claims — JWT is what RLS itself depends on, not just what gates login.
- **Route guarding** (no SPA router): each protected page's script calls `requireAuth()` (redirects to `login.html?redirect=<page>` if no session) or `requireRole('admin')` (redirects home if not admin) at the top of its module. This is UX only — RLS is the real security boundary, enforced regardless of what the client checks.
- **Admin bootstrapping**: no account starts as admin. After deployment, sign up a normal account, then run `update user_roles set role = 'admin' where user_id = '<uuid>'` in the Supabase SQL editor to create the demo admin account.
- **"Disable user"**: sets `profiles.is_active = false`. Enforced in RLS `insert` policies on `properties`/`bookings` — a disabled user can still log in and browse but can't create new listings or bookings. Full account suspension via the Supabase Admin API is explicitly out of scope (that key must never reach the client).

**Explicitly out of scope**: email-based password reset (adds email-deliverability risk for no rubric benefit — profile-page password change while logged in covers the actual need), Edge Functions (no feature here needs server-side compute beyond RLS-guarded CRUD), geocoding API (click-to-place-marker avoids needing one), branches/PRs (optional per the assignment, direct-to-`main` commits satisfy every graded criterion), automated test suite (manual verification via the running app fits this project's time budget and grading rubric better — see Testing below).

**Testing approach**: manual verification only. Each implementation task is verified by running the app in the browser and exercising the feature end-to-end, not by an automated test suite — the grading rubric rewards working features, commit history, and deployment, not test coverage.

## 6. Deployment

- **Netlify**, connected to the `BookingLife` GitHub repo for continuous deployment (push to `main` triggers a build). Build command `npm run build`, publish directory `dist`.
- **Env vars** `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set in Netlify's dashboard, never committed. `.env.example` (placeholder values) is committed; `.env` is gitignored.
- `404.html` (Bootstrap-styled) as a static fallback for unmatched routes.
- **Post-deploy manual step**: sign up a demo guest account and a demo admin account (promoted via SQL editor per Section 5), seed 3–4 sample properties with photos so the live site isn't empty for graders. Exact credentials recorded in the README's "Sample credentials" field.

## 7. Documentation

`README.md` at repo root:
- Header fields: Author, Email, GitHub Repo, Live Project URL, Sample credentials.
- Project description: what BookingLife does, what each role can do.
- Architecture: frontend/backend/build-tool summary (mirrors Section 2).
- Database schema: a Mermaid `erDiagram` block covering all 6 tables and relationships (renders natively on GitHub).
- Local development setup: clone → `npm install` → copy `.env.example` to `.env` and fill Supabase keys → `supabase link --project-ref <ref>` → `supabase db push` → `npm run dev`.
- Key folders/files table: purpose of `src/js/services/`, `src/js/pages/`, `src/js/components/`, `src/js/utils/`, `supabase/migrations/`.

`.github/copilot-instructions.md` (written early, Day 1, so it guides all later work): project summary; hard constraints (no TypeScript, no React/Vue, Bootstrap only); file-organization convention (services own Supabase calls, pages own DOM wiring, components are reusable render functions, utils are pure); the rule that every new screen needs a new `.html` file + registration in `vite.config.js`'s `rollupOptions.input` + navbar entry if applicable; reminder that RLS is the real security boundary, client-side guards are UX only.

## 8. GitHub Workflow & Timeline

Repo already exists (`BookingLife`, owner `nitsavancheva-ship-it`). Every implementation task ends with stage → commit → **push** (not just a local commit — this deviates from the generic task-template default, since graded commit history is on GitHub). Work happens directly on `main` (no branches/PRs — optional per the assignment, not worth the overhead here).

Four day-based phases, each producing multiple independently-verifiable, committed-and-pushed tasks:

- **Day 1 (Jul 11) — Foundation**: project scaffolding (Vite multi-page config, Bootstrap/Leaflet, folder structure, `.env`, `.github/copilot-instructions.md`), Supabase project link, all 6 tables via migrations + RLS + indexes, storage buckets + policies, `supabaseClient.js`/`auth.js`, shared navbar.
- **Day 2 (Jul 12) — Browsing & hosting**: login/register pages, Browse (map+list+filters), property detail view, create/edit property form (map picker + photo upload), host dashboard.
- **Day 3 (Jul 13) — Booking & social**: booking widget + exclusion-constraint conflict handling, My Bookings (cancel/review trigger), review submission + display, profile page (avatar, password change).
- **Day 4 (Jul 14) — Admin, deploy, docs**: admin panel (stats + users/properties/bookings tabs), Netlify deployment + env config + `404.html`, demo data seeding, README + ER diagram, final cross-page responsive QA pass.

Expected commit count: ~25-40, comfortably over the 15-commit minimum, spread across all 4 required days.

## 9. Success Criteria

- All 9 screens work, responsive on desktop and mobile.
- A signed-out visitor can browse and view property details; booking requires login (with redirect-back-after-login).
- A signed-in user can host (create/edit/delete own properties with photos + map pin), book other properties (with DB-enforced no-overlap), cancel own bookings, and review completed stays.
- An admin can manage all users/properties/bookings and see site-wide stats, via the same RLS-gated service functions as regular users.
- App is deployed live on Netlify with working demo credentials (guest + admin).
- `supabase/migrations/*.sql` fully reproduces the schema from a fresh Supabase project.
- README documents description, architecture, ER diagram, local setup, and key folders.
- ≥15 commits on GitHub across ≥3 different calendar days.

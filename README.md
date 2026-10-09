Workspace: Collecting workspace information# Lessgo — Hangouts made easy

![Lessgo Logo](https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/logo.png)

The Lessgo website. It does four jobs:

1. **Marketing site** — static, server-rendered pages that explain the product and
   drive app installs.
2. **Web client** — shareable event deep links (`/e/:id`) so an invited guest can
   RSVP in a browser without installing the app.
3. **Admin portal** — an authenticated operations dashboard with production
   health, aggregate metrics, and Bug House triage. Its **Partners** section
   (`/admin/partners`, dummy data for now) onboards merchants — their category
   decides the partner type: in-store, online checkout code or bookings via
   the partner's API — issues their logins (user ID + one-time temporary
   password), approves online integrations for production ("go-live"), and
   reviews their campaigns before they reach the app.
5. **Design system** — the public `/design` catalogue documents the native
   app's brand, color palettes, typography, iconography, components, layout,
   motion and voice. A host rewrite serves the same page at
   `https://design.lessgo.in`.
4. **Partner portal** (`/partner`, prototype on dummy data) — brands sign in
   with the user ID Lessgo issues them and run offer campaigns for the app's
   Vibes tray (State/District, age and gender targeting). In-store partners
   redeem guests' vouchers at the counter; online partners (shops,
   ticketing/travel platforms) see their orders or bookings and connect their
   checkout or booking API under Integrations. Demo logins are listed on
   `/partner/login`, and logins issued from Admin → Partners work there in the
   same browser. The backend switch-over steps are in
   `web/lib/partner/config.ts` and `web/lib/adminPartnersApi.ts`.

## ✨ What's here

- **Install-first marketing pages** built on the native app's real design
  language — five domain accents (Events lime, Groups orange, Split emerald,
  Vibes coral, Profile purple) over the `#F1EEFF` / `#0E0B24` bases.
- **App mockups drawn in HTML/CSS**, not screenshots. Zero image weight, sharp at
  any DPR, and they restyle with the theme.
- **Light and dark themes**, applied before first paint so there is no flash.
- **Consent-gated analytics** — PostHog only loads after opt-in.
- **WCAG 2.2 AA baseline** — skip link, visible focus, keyboard-operable FAQ,
  and a full `prefers-reduced-motion` fallback for every animation.
- **SEO plumbing** — per-route metadata, `sitemap.xml`, `robots.txt` and JSON-LD
  (`Organization`, `MobileApplication`, `FAQPage`, `BreadcrumbList`).

## 🛠 Technologies

- **Next.js 16** (App Router) — marketing routes are static, `/e/:id` is SSR
- **React 19** and **TypeScript**
- **Tailwind CSS** — tokens mirror the app's `constants/theme.ts`
- **MongoDB** — persistent, duplicate-safe early-access signups
- **Firebase Web SDK** — phone/OTP auth for the web client
- **Lucide React** — icons
- **PostHog** — product analytics, loaded via snippet only after consent

No animation library and no analytics SDK: entrances use a small
IntersectionObserver hook, and everything else is CSS. Node 20.19+ is required.
Linting is ESLint 9 flat config (`eslint.config.mjs`) — `next lint` was removed
in Next 16.

## 🚀 Getting started

### Prerequisites

- Node.js 20.19 or newer
- npm

### Installation

1. Clone and install

   ```bash
   git clone https://github.com/yourusername/lessgo-website.git
   cd lessgo-website
   npm install
   ```

2. Configure the environment

   ```bash
   cp .env.local.example .env.local
   ```

   The marketing pages render without any of it. The web client needs
   `NEXT_PUBLIC_BACKEND_API` and the `NEXT_PUBLIC_FIREBASE_*` values; analytics
   needs `NEXT_PUBLIC_POSTHOG_KEY`; the early-access form needs the server-only
   `MONGODB_URL` and, optionally, `MONGODB_DB`. `/admin` additionally needs
   `ADMIN_USERS`, `ADMIN_SESSION_SECRET`, `ADMIN_GATEWAY_URL`, and
   `ADMIN_GATEWAY_KEY` as documented in `.env.local.example`.

3. Run it

   ```bash
   npm run dev        # dev server
   npm run lint       # eslint (flat config)
   npm run typecheck  # tsc --noEmit
   ```

4. Open `http://localhost:3000`

## 📦 Building for production

```bash
npm run build
npm run start   # respects $PORT
```

`next/font` downloads the Outfit, Inter and Space Mono files at build time, so
the build step needs network access.

### Design subdomain

The app rewrites only `/` on the `design.lessgo.in` host to `/design`, leaving
Next.js assets and the main Lessgo routes untouched. To publish the subdomain:

1. Add `design.lessgo.in` as a custom domain on the Railway website service.
2. Create the CNAME Railway provides in Cloudflare DNS for the `design` host.
3. Keep Cloudflare SSL/TLS in **Full (strict)** mode and verify
   `https://design.lessgo.in` after Railway issues the certificate.

For the Bug House workflow, deploy the gateway first, this website second, and
mobile `0.0.414` or newer last. The website never receives the gateway admin
key in browser code; its route handler keeps that credential server-side and
allowlists only the current dashboard and Bug House operations.

## 🤝 Partner portal: backend mode

The merchant portal (`/partner`) and Admin → Partners run on dummy data kept in
the browser until the site is built with
`NEXT_PUBLIC_PARTNER_PORTAL_BACKEND=true`. Then:

- **Portal** → this site's BFF, `app/api/partner/*`
  ([`web/lib/partner/partnerBff.ts`](web/lib/partner/partnerBff.ts)) → the
  gateway's BFF-only `/partner-auth/*` and `/partner/*` routes (it sends
  `x-partner-portal-key` from the server-only `PARTNER_GATEWAY_KEY`) →
  `backend-offers-service`. The session token lives only in the httpOnly
  `lessgo_partner_session` cookie (SameSite=Lax, Secure in production, at most
  8 hours); the browser never sees it or the key.
- **Admin → Partners** → the existing admin BFF
  (`/api/admin/gateway/*`, allowlisted in
  [`web/lib/adminGatewayPolicy.js`](web/lib/adminGatewayPolicy.js)) → the
  gateway's `/admin/partners…` routes.

| Browser → this site | → Gateway | Session cookie |
| --- | --- | --- |
| `POST /api/partner/login` | `POST /partner-auth/login` | set when `kind` is `signed_in` (token stripped from the body) |
| `POST /api/partner/login/first-password` | `POST /partner-auth/first-password` | set (token stripped) |
| `GET /api/partner/session` | `GET /partner-auth/session` | cleared on a 401 |
| `POST /api/partner/logout` | `POST /partner-auth/logout` | always cleared (204) |
| `GET/POST/PUT/PATCH/DELETE /api/partner/<path>` | same method on `/partner/<path>` + query | sent as `x-partner-session`; cleared on a 401 |

Only `x-partner-session`, `idempotency-key`, `x-partner-client-ip`,
`x-request-id` and `content-type` are forwarded. Mutations must be same-origin
JSON (64 KB max), paths are plain `[A-Za-z0-9_.:-]` segments, and gateway
statuses and JSON bodies (`message`, `code`, `details`) pass through unchanged.

Submitting a campaign and confirming a redemption send an `Idempotency-Key`
that names the user's action, not the request: the campaign wizard and the
Redeem console reuse it on every retry until one succeeds
([`web/lib/partner/idempotency.ts`](web/lib/partner/idempotency.ts)), so a
retry after a timeout gets the first result back instead of writing twice.

To run it locally:

1. Start `backend-offers-service` on port 8790 (`npm run seed:demo` creates
   the demo partners).
2. Start `gateway-service` on port 8090 (`PORT=8090`) with
   `OFFERS_SERVICE_URL=http://localhost:8790`, the offers service's
   `INTERNAL_API_KEY` and a random `PARTNER_PORTAL_API_KEY`.
3. In this site's `.env.local`:

   ```bash
   NEXT_PUBLIC_PARTNER_PORTAL_BACKEND=true
   PARTNER_GATEWAY_URL=http://localhost:8090
   PARTNER_GATEWAY_KEY=<the gateway's PARTNER_PORTAL_API_KEY>
   # Admin → Partners goes through the admin BFF:
   ADMIN_GATEWAY_URL=http://localhost:8090
   ADMIN_GATEWAY_KEY=<the gateway's ADMIN_API_KEY>
   ```

4. Restart `npm run dev` (or rebuild): `NEXT_PUBLIC_*` values are inlined at
   build time. Sign in at `/partner/login` with a seeded login, e.g.
   `stylecart.owner` / `Lessgo@2026`.

Without `PARTNER_GATEWAY_URL` (or its fallbacks) and `PARTNER_GATEWAY_KEY`,
`/api/partner/*` answers `503 not_configured`. Run `npm run test:partner` for
the BFF and portal rules and `npm run test:admin-policy` for the admin
allowlist and the admin/portal Content-Security-Policy.

## 📂 Project structure

```
lessgo-website/
├── app/
│   ├── (marketing)/         # Static marketing pages
│   │   ├── page.tsx         # Home
│   │   ├── features/
│   │   ├── download/
│   │   ├── help/
│   │   ├── whats-new/
│   │   ├── privacy/
│   │   └── terms/
│   ├── api/early-access/    # MongoDB-backed interest signup endpoint
│   ├── e/[id]/              # Event deep link (SSR, indexable)
│   ├── onboarding/          # Phone + OTP
│   ├── me/                  # Signed-in home
│   ├── globals.css          # Design tokens, base styles, luma-* compat layer
│   ├── layout.tsx           # Fonts, metadata, theme script, consent banner
│   ├── sitemap.ts
│   └── robots.ts
├── components/              # Site UI (@ui/*)
│   ├── phone/               # HTML/CSS recreations of the app screens
│   └── sections/            # Homepage sections
├── content/site.ts          # Every user-facing string (@content/*)
└── web/                     # Event/OTP web-client lib + components (@web/*)
```

All marketing copy lives in `content/site.ts`. Nothing is hardcoded in
components, so adding Hindi later is a config change rather than a rewrite.

## 🚩 Before public launch

- [ ] Have counsel review `/privacy` and `/terms`, and confirm the Grievance
      Officer contact.
- [ ] Set the server-only `MONGODB_URL` and optional `MONGODB_DB`. Until MongoDB
      is configured, the signup form honestly tells visitors to email instead
      of silently dropping their address.
- [ ] Add `NEXT_PUBLIC_IOS_APP_URL` when the App Store listing is live. The
      Google Play product page is configured in `web/lib/config.ts`, and store
      badges activate independently.
- [ ] Set `NEXT_PUBLIC_SITE_URL` so canonicals, OG tags and the sitemap resolve.

## 📄 License

MIT — see the LICENSE file.

## 👥 Contributors

- Priytosh Tripathi

---

Built with ❤️ in India

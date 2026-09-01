Workspace: Collecting workspace information# Lessgo — Hangouts made easy

![Lessgo Logo](https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/logo.png)

The Lessgo website. It does two jobs:

1. **Marketing site** — static, server-rendered pages that explain the product and
   drive app installs.
2. **Web client** — shareable event deep links (`/e/:id`) so an invited guest can
   RSVP in a browser without installing the app.

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
   `MONGODB_URL` and, optionally, `MONGODB_DB`.

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
- [ ] Flip `site.storesLive` to `true` in `content/site.ts` once the Play Store
      and App Store listings are live, and set `NEXT_PUBLIC_IOS_APP_URL`.
- [ ] Set `NEXT_PUBLIC_SITE_URL` so canonicals, OG tags and the sitemap resolve.

## 📄 License

MIT — see the LICENSE file.

## 👥 Contributors

- Priytosh Tripathi

---

Built with ❤️ in India

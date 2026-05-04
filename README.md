# OphthaXP — Frontend (Next.js 14)

Live, cohort-based mentorship for practising ophthalmologists and final-year MBBS students. This repo is the **frontend only** — the API routes under `/api/*` are stubs that you can either replace by proxying to your real backend or implement directly with Next.js route handlers.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · framer-motion · lucide-react**, fully **SEO-friendly** out of the box (metadata, OpenGraph, Twitter cards, sitemap, robots, JSON-LD for Organization, WebSite, Course, Person).

---

## Quick start

```bash
# 1. install deps
npm install

# 2. copy env
cp .env.example .env.local
# edit NEXT_PUBLIC_SITE_URL, ANTHROPIC_API_KEY (optional), etc.

# 3. dev
npm run dev          # http://localhost:3000

# 4. production build
npm run build
npm run start
```

Requires Node.js 18.18+ (Node 20 LTS recommended).

---

## What's in the page

The landing page (`src/app/page.tsx`) renders these sections, top to bottom, matching the Figma:

| # | Section | Component | What's interactive |
|---|---------|-----------|--------------------|
| 1 | Sticky nav with "Ask OphthaXP" + "Get Started" | `Navbar` | Anchors to `#smart-assist` & `#get-started` |
| 2 | Hero — vertical scrolling image columns + headline | `Hero` | Two CSS-animated marquee columns (left scrolls down, right scrolls up). Pauses on hover. |
| 3 | "Learn from Those Who've Defined the Field" video | `LegendsVideo` | **Play / pause, mute / unmute, fullscreen toggle** with `requestFullscreen` API |
| 4 | "Built Around How Real Learning Happens" | `HowLearningHappens` | 5-card grid (2 wide on top, 3 below) |
| 5 | "Programs Designed for Those Who Are Ready for More" | `ProgramsSection` | **Specialty tab pills** filter the doctor row · **horizontal scroll** with snap + Prev/Next chevrons |
| 6 | "Smart assistance for every step." chat | `SmartAssist` | Quick-prompt chips · multi-line input · `POST /api/ai-chat` (Claude-powered when `ANTHROPIC_API_KEY` is set, deterministic stub otherwise) |
| 7 | Closing copy + CTA | `ClosingCta` | |
| 8 | Footer | `Footer` | |

### Key UX details
- **Scrollable hero**: pure CSS keyframes (`@tailwind` keyframes `scrollY` / `scrollYReverse`) on a duplicated track — no JS, no layout thrash. Top + bottom edges fade with `bg-vignette-y` masks.
- **Video controls**: native `<video>` element wrapped with controlled state for `muted`, `paused`, and a fullscreen button that calls `Element.requestFullscreen()`. ESC sync handled via `fullscreenchange`.
- **Doctor rail**: native `overflow-x-auto` with `scroll-snap-x mandatory` and `scrollBy({behavior:'smooth'})` Prev/Next buttons. Keyboard- and touch-friendly. Scrollbar hidden via `.no-scrollbar`.
- **Tabs**: real `role="tablist"`/`role="tab"` semantics. Filtering re-renders the rail on click.

---

## SEO checklist (already wired)

- [x] `metadata` object in `src/lib/seo.ts` with `metadataBase`, title template, description, keywords, authors, category
- [x] OpenGraph + Twitter card images (`/public/og.jpg` — drop your own asset there)
- [x] `app/robots.ts` → `/robots.txt`
- [x] `app/sitemap.ts` → `/sitemap.xml` (includes all programs and doctors dynamically)
- [x] **JSON-LD**:
  - `EducationalOrganization` + `WebSite` injected globally in `app/layout.tsx`
  - `ItemList` of `Course` on the home page
  - `Course` + `Offer` on each program detail page
  - `Person` on each doctor detail page
- [x] Per-page canonical via `alternates.canonical`
- [x] Semantic landmarks: `<header>`, `<main>`, `<nav>`, `<section aria-labelledby>`, `<article>`, `<footer>`
- [x] `next/image` for all images (AVIF/WebP, lazy by default, `priority` only on the first hero tiles)
- [x] `next/font` (Inter + Playfair Display) with `display: "swap"`
- [x] Security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) in `next.config.mjs`
- [x] `aria-label`s on every icon button (play, mute, fullscreen, scroll arrows, etc.)
- [x] Prefers-reduced-motion compatible (animations are skip-able by users via OS setting; pause-on-hover for marquees)
- [x] H1 only once per page (`<h1>` is the hero headline)

### Things you should still do before launch
1. Replace `/public/og.jpg`, `/public/favicon.ico`, `/public/apple-touch-icon.png`, `/public/logo.png`.
2. Set `NEXT_PUBLIC_SITE_URL` in production env.
3. Set `GOOGLE_SITE_VERIFICATION` if you want Search Console verification via meta tag.
4. Replace placeholder Unsplash portraits in `src/lib/data.ts` with your real mentor photos under `/public/doctors/`.
5. Replace `HERO_VIDEO_SRC` with your actual hero video (host on Mux / Cloudflare Stream / S3+CloudFront for best Core Web Vitals).
6. Add an `og.jpg` (1200×630) — referenced by Open Graph + Twitter.

---

## API routes (stubs you can wire to your backend)

All under `src/app/api/*`. Each one is a working Next.js route handler returning JSON. Replace the body with `fetch(API_BASE_URL + ...)` calls when your backend is ready.

| Method | Path | Purpose | Body / Query | Used by |
|--------|------|---------|--------------|---------|
| GET | `/api/specialties` | List all specialty tabs | – | (future) tab hydration |
| GET | `/api/doctors` | List mentors | `?specialty=cataract&q=mehta` | (future) `ProgramsSection` SWR |
| GET | `/api/doctors/[slug]` | Single mentor | – | `/doctors/[slug]` |
| GET | `/api/programs` | List programs | `?specialty=retina` | `/programs` page |
| GET | `/api/programs/[slug]` | Single program | – | `/programs/[slug]` |
| POST | `/api/leads` | Capture "Get Started" lead | `{ fullName, email, phone?, qualification, yearOfCompletion?, interestedIn?, message? }` | Hero CTA |
| POST | `/api/enrollments` | Enrol in a program | `{ programSlug, userId? }` | Program detail |
| POST | `/api/ai-chat` | Ask the assistant | `{ message, history? }` | `SmartAssist` |
| POST | `/api/newsletter` | Subscribe | `{ email }` | Footer (when added) |
| POST | `/api/auth/login` | Email/password login | `{ email, password }` | Auth flow |
| POST | `/api/auth/register` | Sign-up (MBBS student) | `{ fullName, email, password, qualification }` | Auth flow |
| GET  | `/api/auth/me` | Current user | – | Client bootstrap |

### Backend endpoints you'll likely need (suggested contract for your API team)

```
GET    /v1/specialties
GET    /v1/doctors?specialty=&q=&page=&limit=
GET    /v1/doctors/{slug}
GET    /v1/programs?specialty=&page=&limit=
GET    /v1/programs/{slug}
POST   /v1/leads
POST   /v1/enrollments
POST   /v1/payments/checkout       (Razorpay/Stripe order creation)
POST   /v1/payments/webhook        (verify + mark enrollment paid)
POST   /v1/auth/register
POST   /v1/auth/login
POST   /v1/auth/logout
POST   /v1/auth/refresh
GET    /v1/auth/me
GET    /v1/student/dashboard       (after login — upcoming sessions, recordings)
GET    /v1/cohorts/{id}/sessions
POST   /v1/sessions/{id}/rsvp
POST   /v1/ai-chat                 (or proxy direct to Anthropic from the Next API route)
POST   /v1/newsletter
```

The Next.js routes are already shaped to match — switch the in-memory data for `fetch(process.env.API_BASE_URL + "/v1/...")` and you're done.

---

## Project structure

```
D:\opx
├── public/                     # static assets (drop og.jpg, favicons, doctor photos here)
├── src
│   ├── app
│   │   ├── api/...             # route handlers (see table above)
│   │   ├── doctors/            # /doctors and /doctors/[slug]
│   │   ├── programs/           # /programs and /programs/[slug]
│   │   ├── globals.css
│   │   ├── layout.tsx          # fonts + JSON-LD + metadata
│   │   ├── not-found.tsx
│   │   ├── page.tsx            # the landing page
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   ├── components              # 8 sections + Navbar/Footer
│   ├── lib
│   │   ├── data.ts             # mock doctors/programs (replace with API)
│   │   ├── seo.ts              # buildMetadata + JSON-LD helpers
│   │   └── utils.ts
│   └── types/index.ts
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

---

## Primary user flow — "MBBS student joins a senior doctor's class"

The site is built around this flow:

1. Visitor lands on `/` → reads the headline, sees the legends video, and the cohort proposition.
2. Clicks **Get Started** (hero) → scrolls to **Smart Assist** chat → describes that they just finished MBBS.
3. The assistant (Claude on the backend, or stub in dev) suggests a matching cohort (e.g. *Cornea & Refractive Fellowship Prep*).
4. Clicks the rail's mentor card → `/doctors/[slug]` profile.
5. Picks a program → `/programs/[slug]` → enrols → `POST /api/enrollments`.

The `stubReply()` function in `src/app/api/ai-chat/route.ts` already handles "MBBS / student" intent specifically.

---

## Deployment

- **Vercel** (recommended): import the repo, add `NEXT_PUBLIC_SITE_URL` and `ANTHROPIC_API_KEY`, and deploy. Sitemap and robots are served automatically.
- **Self-hosted**: `npm run build && npm run start` behind any reverse proxy. Make sure to set `NEXT_PUBLIC_SITE_URL` correctly so canonicals and the sitemap point at production.

---

## License

Private — © OphthaXP.
#   w e b s i t e  
 
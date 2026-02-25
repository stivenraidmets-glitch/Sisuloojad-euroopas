# Paris → Tallinn Race (No Money)

Production-ready web app for a YouTube event: two teams race Paris → Tallinn; viewers see approximate locations on a map, vote, buy penalties (distractions), and spin a wheel.

**New to this?** → **[QUICKSTART.md](./QUICKSTART.md)** – run the app on your computer in a few minutes.  
**Want it live on the internet?** → **[GET-IT-ONLINE.md](./GET-IT-ONLINE.md)** – free hosting (Vercel + Neon), no server, no experience needed.

## Tech stack

- **Next.js 14+** (App Router) + TypeScript
- **TailwindCSS** + **Framer Motion**
- **Map**: Mapbox GL JS (minimal dark style)
- **Database**: PostgreSQL with Prisma (SQLite for local dev)
- **Auth**: NextAuth with magic link (email)
- **Payments**: Stripe Checkout
- **Realtime**: Pusher (location + vote updates)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy the example and fill in values:

```bash
cp .env.example .env.local
```

Required for local dev:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite: `file:./dev.db` or Postgres URL |
| `NEXTAUTH_URL` | e.g. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public token (mapbox.com) |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `BROADCAST_SECRET` | Secret for `/broadcast?secret=...` |

For magic link email (dev): use [Ethereal](https://ethereal.email) or set:

- `EMAIL_SERVER`: e.g. `smtp://user:pass@smtp.ethereal.email:587`
- `EMAIL_FROM`: `noreply@yourdomain.com`

For Stripe:

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

For Pusher (realtime):

- `NEXT_PUBLIC_PUSHER_KEY`, `PUSHER_APP_ID`, `PUSHER_SECRET`, `PUSHER_CLUSTER` (e.g. `eu`)

### 3. Database

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

For migrations (Postgres): `npm run db:migrate` after switching `schema.prisma` to `provider = "postgresql"`.

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How to test locally

1. **Auth**: Go to `/login`, enter your email. For local dev without a real SMTP server, use [NextAuth with Nodemailer + Ethereal](https://next-auth.js.org/providers/email) or mock the provider.
2. **Map**: Add `NEXT_PUBLIC_MAPBOX_TOKEN`; the map loads and shows Europe. Team positions appear after broadcast or seed.
3. **Vote**: Log in, then use the vote buttons on the home page.
4. **Wheel**: After first login, the “Spin the wheel” CTA appears; spin once per account.
5. **Shop**: Log in, pick a penalty and team; checkout redirects to Stripe. Use Stripe test cards (e.g. `4242 4242 4242 4242`).
6. **Stripe webhook (local)**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Put the printed `whsec_...` in `STRIPE_WEBHOOK_SECRET`.
7. **Broadcast**: Open `/broadcast?secret=YOUR_BROADCAST_SECRET`, choose team, “Start sharing location”. Allow browser geolocation; position updates every 30s with jitter.
8. **Admin**: Set your email in `ADMIN_EMAILS`, log in, go to `/admin`. Change race status, wheel config, and penalty statuses.

## Map provider (Mapbox)

1. Create a free account at [mapbox.com](https://www.mapbox.com).
2. Create a token with default scopes (or `styles:read`, `fonts:read`).
3. Set `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`.

## Deployment

- **Zone.ee (Estonian hosting / domain):** see **[DEPLOY_ZONE.md](./DEPLOY_ZONE.md)** for step-by-step hosting on Zone.ee web hosting or VPS.
- **Vercel:**

1. Connect the repo to Vercel.
2. Set all env vars in the Vercel project (no `.env.local` in repo).
3. Use Postgres (e.g. Vercel Postgres or Neon); set `DATABASE_URL`.
4. Run migrations in CI or manually: `npx prisma migrate deploy`.
5. Stripe webhook: set endpoint to `https://your-domain.com/api/stripe/webhook` and use the new `STRIPE_WEBHOOK_SECRET`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema (SQLite / dev) |
| `npm run db:migrate` | Run migrations (Postgres) |
| `npm run db:seed` | Seed teams, penalty options, wheel config |
| `npm run db:studio` | Open Prisma Studio |

## Site structure

- `/` — Home: map, team cards, vote, shop, recent penalties, wheel CTA
- `/team/1`, `/team/2` — Team detail + penalties list
- `/login` — Email magic link
- `/broadcast` — Team location broadcaster (query: `?secret=...`)
- `/admin` — Admin dashboard (admin emails only)

## Security

- Broadcaster endpoint rate-limited (e.g. 1 req / 5 s per team).
- Inputs validated with Zod; Stripe webhook signature verified.
- Admin routes protected by `ADMIN_EMAILS`; broadcast by `BROADCAST_SECRET`.
- Location privacy: jitter (≈1–3 km) and optional rounding; updates throttled.

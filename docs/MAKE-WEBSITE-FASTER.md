# How to make your website faster

You **don’t need to buy premium** to get a faster site. Most gains come from free optimizations and good defaults.

---

## Free things that already help

- **Vercel (free tier)** – Fast CDN, serverless, good caching. Enough for most sites.
- **Next.js** – Automatic code splitting, optimizations.
- **Your current setup** – Lazy-loaded map, cached country data, icon tree-shaking.

---

## Free optimizations you can do

### 1. Use a CDN for images (free)
- Put team avatars and static images on a CDN (e.g. Vercel’s own, or Cloudflare Images free tier) and reference them by URL.
- Keeps the app fast and saves bandwidth from your app.

### 2. Reduce API polling on the map
- In `RaceMap.tsx`, the map polls for teams/countries. If intervals are short (e.g. every 2–3 seconds), consider 5–8 seconds for non-critical updates so the server and DB do less work.

### 3. Add caching headers where it’s safe
- For data that doesn’t change every second (e.g. penalty options, static content), your API can send `Cache-Control` (e.g. `max-age=60`) so the browser caches responses. Don’t cache live data (locations, active penalties).

### 4. Keep the map on a single tab
- Opening many tabs with the map increases load (Mapbox, GeoJSON, polling). One main tab is usually enough.

### 5. Environment and region
- **Database:** Use a Neon (or other DB) region close to your Vercel region (e.g. same continent) to lower latency.
- **Vercel:** Deploy in the region closest to your users (e.g. EU if most users are in Europe).

---

## When premium *might* help (optional)

| Service   | Free tier              | Paid can help if…                          |
|----------|------------------------|--------------------------------------------|
| **Vercel** | Generous limits        | You need more bandwidth or longer builds.  |
| **Mapbox** | Free tier with limits  | You have huge traffic or need more tiles.   |
| **Neon (DB)** | Free tier             | You need more connections or storage.      |
| **Pusher**  | Free tier              | You need more connections or messages.     |

Start with the free tiers. Upgrade only if you hit limits or need more capacity.

---

## Quick checklist

- [ ] DB and Vercel in same region (or close).
- [ ] Don’t poll APIs more often than needed (e.g. 5–8 s for map if possible).
- [ ] Use lazy loading for heavy components (you already do for the map).
- [ ] Avoid opening many tabs with the map at once.
- [ ] Add `Cache-Control` only for non–real-time API responses.

**Summary:** You can make the site noticeably faster with free optimizations and good settings. Premium is only for scaling beyond free-tier limits, not required for a fast site.

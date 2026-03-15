# Scaling to ~2000 concurrent users

This guide covers what’s in place and what to configure so the site can handle ~2000 people chatting and using the app at once.

---

## What we’ve done in the app

1. **Real-time chat via Pusher**  
   New chat messages are pushed over Pusher instead of every client polling the API. So:
   - Before: 2000 users × 1 request every 5 sec = **400 requests/sec** to `/api/chat`.
   - After: **0** ongoing requests for new messages; only initial load and when someone sends.

2. **Less polling**  
   Chat still does a fallback poll every **30 seconds** (e.g. if Pusher drops). Map and other features use their own Pusher events where possible.

3. **Same channel for chat**  
   Chat uses the existing `race` channel and `chat-message` event, so one connection per user covers chat, map, votes, penalties, etc.

---

## What you need to run ~2000 concurrent users

### 1. Pusher (required for real-time)

- **Free tier:** ~100 concurrent connections, so not enough for 2000.
- **Paid:** For 2000 CCU you need a plan that supports **2000+ concurrent connections** (and enough messages/events).
- **Steps:** [Pusher pricing](https://pusher.com/channels/pricing) → pick a plan that includes 2000+ connections. Add `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` (and `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`) in Vercel.

### 2. Database (Neon or other)

- Use **connection pooling** (e.g. Neon’s pooled connection string, not the direct one).
- Set `DATABASE_URL` in Vercel to the **pooled** URL (often ends with `-pooler` or has `?pgbouncer=true`).
- Put the DB in the **same region** as your Vercel project (e.g. EU) to keep latency low.

### 3. Vercel

- **Hobby:** Fine for development and moderate traffic.
- **Pro:** Recommended for 2000 CCU (more bandwidth, longer execution, no cold-start limits).
- Ensure **Node.js** version and **region** are set; region should match your users (e.g. EU).

### 4. Optional: rate limiting (chat spam)

- To limit abuse (e.g. one user spamming 100 msg/min), add rate limiting on `POST /api/chat`.
- On Vercel (multiple serverless instances), use a **shared** store, e.g. **Upstash Redis** + `@upstash/ratelimit`, and reject requests over e.g. 20 messages per minute per user.
- Not required for “it works at 2000 users”; only for moderation.

---

## Checklist for 2000 CCU

| Item | Action |
|------|--------|
| **Pusher** | Upgrade to a plan with 2000+ concurrent connections; set env vars on Vercel. |
| **Database** | Use pooled connection string; same region as Vercel. |
| **Vercel** | Prefer Pro for production; set region to match users. |
| **Chat** | Already uses Pusher for new messages; fallback poll every 30s. |
| **Rate limiting** | Optional: add Upstash Redis + rate limit on `POST /api/chat`. |

---

## Quick test

1. Deploy with Pusher (paid plan), pooled DB, and Vercel Pro.
2. Use a load tester (e.g. k6 or Artillery) to simulate 2000 concurrent users: open the page, subscribe to Pusher, send a few chat messages per user.
3. In Pusher dashboard, check **connections** and **message count** to confirm you’re within plan limits.

You don’t need to “buy premium” everywhere—only **Pusher** (and ideally Vercel Pro + pooled DB) for this scale. The app is already structured so chat and engagement scale with Pusher and DB pooling.

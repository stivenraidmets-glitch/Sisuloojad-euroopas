# Chat not updating live for everyone

If new messages don’t appear for other users without refreshing, it’s almost always **Pusher** (real-time) not set up or not working.

## 1. Check environment variables

Live chat needs these set **both locally and in Vercel** (and redeploy after changing them):

| Variable | Where | Purpose |
|----------|--------|--------|
| `NEXT_PUBLIC_PUSHER_KEY` | Client (browser) | So the chat can subscribe to the "race" channel. **If this is missing, the client never subscribes and no one gets live updates.** |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Client | Usually `eu`. Must match your Pusher app. |
| `PUSHER_APP_ID` | Server | So the API can trigger events. |
| `PUSHER_SECRET` | Server | So the API can trigger events. |
| `PUSHER_CLUSTER` | Server | Usually `eu`. |
| `PUSHER_KEY` | Server (optional) | Can use `NEXT_PUBLIC_PUSHER_KEY` instead; server falls back to it. |

**Important:** `NEXT_PUBLIC_*` values are baked into the client at **build time**. If you add or change them in Vercel, you must **redeploy** (new build) for the chat to use them.

## 2. Check Vercel deployment

1. Vercel → your project → **Settings** → **Environment Variables**.
2. Ensure `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER` exist for the environment you use (Production/Preview).
3. **Redeploy** (Deployments → … on latest → Redeploy) so the new values are in the build.

## 3. Check server logs (Pusher trigger failing)

If the **sender** sees their message but **others** don’t, the message is saved but the broadcast may be failing.

1. Vercel → **Deployments** → latest → **Functions**.
2. Open a log for a request that sends a chat message (e.g. POST to `/api/chat`).
3. If you see: **`Chat: Pusher trigger failed (message was saved). Check PUSHER_* env vars.`**  
   Then the server can’t trigger Pusher. Fix server-side env vars: `PUSHER_APP_ID`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, and key (`PUSHER_KEY` or `NEXT_PUBLIC_PUSHER_KEY`).

## 4. Fallback when Pusher isn’t configured

- If **no** `NEXT_PUBLIC_PUSHER_KEY` is set, the chat falls back to **polling every 5 seconds** so messages still appear, with a short delay.
- If Pusher **is** set and working, the chat uses it for instant updates and only polls every 30 seconds as a backup.

## 5. Pusher dashboard

- In [Pusher Dashboard](https://dashboard.pusher.com/) → your app → **App Keys**:
  - Key = what you put in `NEXT_PUBLIC_PUSHER_KEY` and `PUSHER_KEY`.
  - Cluster = what you put in `PUSHER_CLUSTER` / `NEXT_PUBLIC_PUSHER_CLUSTER` (e.g. `eu`).
- Check **Debug Console** to see if events are received when someone sends a message.

Summary: **Set all Pusher env vars, then redeploy.** If it still doesn’t update live, check Vercel function logs for the “Pusher trigger failed” message and fix the server-side Pusher config.

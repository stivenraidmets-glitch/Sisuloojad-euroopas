# Chat: Emoji & GIF – Setup Guide

## What works without setup
- **Emoji button** (😀 next to the chat input) works immediately. Click it, pick an emoji, it’s added to your message.

## What needs one extra step
- **GIF search** needs a free GIPHY API key.

---

## Step-by-step: Enable GIF search

### 1. Get a GIPHY API key (free)
1. Open: **https://developers.giphy.com/**
2. Click **“Create an Account”** or **“Log in”**.
3. After login, go to **https://developers.giphy.com/dashboard/**.
4. Click **“Create an App”**.
5. Choose **“API”** (not SDK).
6. Fill in app name (e.g. “Euroopa Chat”) and create.
7. Copy the **API Key** (long string like `AbCdEf123...`).

### 2. Add the key to your project (local)
1. In your project folder, open the file **`.env`** (or create it if it doesn’t exist).
2. Add this line (use your real key):
   ```bash
   GIPHY_API_KEY=your_api_key_here
   ```
3. Save the file.

### 3. Restart the dev server
1. In the terminal where `npm run dev` is running, press **Ctrl+C** to stop it.
2. Start it again:
   ```bash
   npm run dev
   ```

### 4. Test in the app
1. Open the chat (e.g. “Vestlus” tab).
2. Click the **image icon** (GIF button) next to the input.
3. Type a word (e.g. “wave”) and wait a moment.
4. Click a GIF to send it.

---

## If you deploy to Vercel

1. In Vercel: your project → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `GIPHY_API_KEY`
   - **Value:** your GIPHY API key
3. Save and **redeploy** the project.

---

## Troubleshooting

| Problem | What to do |
|--------|-------------|
| Emoji picker doesn’t open | Refresh the page; make sure you’re logged in. |
| GIF search shows “no results” | Check that `GIPHY_API_KEY` is in `.env`, no typos, and you restarted the dev server. |
| GIF search works locally but not on Vercel | Add `GIPHY_API_KEY` in Vercel env vars and redeploy. |

That’s it. Emoji works out of the box; GIF search works after adding the key and restarting.

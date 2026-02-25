# Run the app in 5 minutes (no experience needed)

**Want to put the site on the internet so others can visit?** → See **[GET-IT-ONLINE.md](./GET-IT-ONLINE.md)** for the easiest free hosting (Vercel + Neon).

Follow these steps in order. Do everything in the **Terminal** (on Mac: open **Terminal** from Applications, or in VS Code/Cursor use the terminal at the bottom).

---

## Step 1: Open the project folder in Terminal

1. In Cursor/VS Code, open the terminal: **Terminal → New Terminal** (or press `` Ctrl+` ``).
2. You should see a prompt. Type this and press Enter:

```bash
cd "/Users/stivenraidmets/euroopa website"
```

---

## Step 2: Install dependencies

Copy this whole block, paste it in the terminal, press Enter, and wait until it finishes (can take 1–2 minutes):

```bash
npm install
```

If you see `command not found: npm`, you need to install Node.js first: go to https://nodejs.org and download the **LTS** version, install it, then close and reopen the terminal and try again.

---

## Step 3: Create your environment file

Copy this **entire block** (all lines), paste it in the terminal, and press Enter:

```bash
cat > .env.local << 'EOF'
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-change-me-in-production"
ADMIN_EMAILS="stivenraidmets@gmail.com"
BROADCAST_SECRET="dev-broadcast-secret"
ENABLE_DEV_LOGIN=1
NEXT_PUBLIC_ENABLE_DEV_LOGIN=1
EOF
```

**Important:** Replace `you@example.com` with your real email if you want to use the admin page. You can change it later in `.env.local`.

Then create a `.env` file so the database setup can run (copy, paste, Enter):

```bash
echo 'DATABASE_URL="file:./dev.db"' > .env
```

---

## Step 4: Set up the database

Run this **one** command (copy, paste, Enter):

```bash
npm run setup
```

You should see something like “Seed completed” at the end.

---

## Step 5: Start the app

Run:

```bash
npm run dev
```

Wait until you see something like:

```
✓ Ready in 3s
○ Local: http://localhost:3000
```

---

## Step 6: Open the app in your browser

1. Open your browser (Chrome, Safari, Firefox, etc.).
2. In the address bar type: **http://localhost:3000**
3. Press Enter.

You should see the Paris → Tallinn Race home page.

---

## How to log in (without setting up email)

So you can try everything without configuring email:

1. Go to **http://localhost:3000/login**
2. Use this **exact** login:
   - **Email:** `test@test.com`
   - **Password:** `dev`
3. Click sign in. You’ll be logged in and can vote, spin the wheel, and open team pages.

This only works when the app is running locally with the `.env.local` from Step 3.

---

## Stopping the app

In the terminal where the app is running, press **Ctrl+C** to stop it. To start again later, run from the project folder:

```bash
npm run dev
```

---

## Optional: show the map

The map needs a free Mapbox token:

1. Go to https://account.mapbox.com and create an account.
2. Create a token (default settings are fine).
3. Open the file `.env.local` in your project and add this line (use your token):

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

4. Restart the app (Ctrl+C, then `npm run dev` again). The map will show on the home page.

---

## How to show each team's live location on the map

The map shows a pin per team when that team has a location set. You can do it in two ways:

### Option A: Test with admin (no phone needed)

1. Log in with an **admin** email (the one you put in `ADMIN_EMAILS` in `.env.local`), or use the dev login and then add that same email to `ADMIN_EMAILS` and log in again.
2. Go to **http://localhost:3000/admin**
3. Under **Teams**, for each team you’ll see **Lat** and **Lng** and a **Set location** button.
4. Enter coordinates (e.g. Paris: Lat `48.86`, Lng `2.35` for Team 1; Tallinn: Lat `59.44`, Lng `24.75` for Team 2) and click **Set location**.
5. Open the home page (or refresh it). The map updates about every 30 seconds, or refresh to see the pins right away.

### Option B: Real GPS from the broadcast page

1. Open **http://localhost:3000/broadcast?secret=dev-broadcast-secret** (use the same secret as in your `.env.local`: `BROADCAST_SECRET`).
2. Choose **Team 1** or **Team 2**, click **Start sharing location**, and allow the browser to use your location.
3. That device’s position is sent every 30 seconds (with small random jitter for privacy). Use a second device or browser for the other team if you want both pins.
4. The map on the home page will show the updated positions (it checks for new locations every 30 seconds).

### Option C: Use your phone’s GPS (same Wi‑Fi)

So the **phone** sends its location (not the computer):

1. **On your computer:** stop the app (Ctrl+C), then start it so the phone can reach it:
   ```bash
   npm run dev:phone
   ```
2. Find your computer’s IP (Mac: System Settings → Network → Wi‑Fi → Details, or run `ipconfig getifaddr en0` in Terminal; Windows: `ipconfig`).
   Example: `192.168.1.105`.
3. **On your phone:** connect to the **same Wi‑Fi** as the computer. Open the browser and go to:
   ```
   http://192.168.1.105:3000/broadcast?secret=dev-broadcast-secret
   ```
   (Replace `192.168.1.105` with your computer’s IP.)
4. Choose the team, tap **Start sharing location**, and allow the browser to use your location. The phone’s GPS is now sent to the app.
5. On the computer, open **http://localhost:3000** to see the map with the phone’s position.

---

## Troubleshooting

| Problem | What to do |
|--------|------------|
| `command not found: npm` | Install Node.js from https://nodejs.org (LTS), then restart the terminal. |
| `EACCES` or permission errors | Don’t use `sudo`. Make sure you’re in the project folder and try again. |
| Port 3000 already in use | Another app is using 3000. Close it or run `npm run dev -- -p 3001` and open http://localhost:3001. |
| “Invalid credentials” on login | Use exactly `test@test.com` and password `dev` (and that dev login is only for local run). |

If something else breaks, copy the full error from the terminal and ask for help (e.g. in Cursor chat), and mention you followed QUICKSTART.md.

# Get your site online in 30 minutes (no experience needed)

This guide gets your Paris → Tallinn võistlus site **live on the internet** so anyone can visit. You’ll use **Vercel** (free) and **Neon** (free database). No server, no coding, no Zone.ee needed to start.

Your site will be at: **https://your-project-name.vercel.app**  
Later you can add a custom domain (e.g. zone.ee) if you want.

---

## Step-by-step checklist (do in order)

| Step | What to do |
|------|------------|
| **1** | Create a GitHub repo and push your code (see Step 1 below). |
| **2** | Create a Neon project at neon.tech and copy the **connection string** (DATABASE_URL). |
| **3** | In Vercel: Import the repo, add all **Environment Variables** (Step 3 table), then click **Deploy**. |
| **4** | In Terminal: set `DATABASE_URL` to your Neon URL, run `npx prisma db push` then `npx prisma db seed` (Step 4). You can do this **before or after** the first deploy; the build will succeed either way, but the site will only work once the tables exist. |
| **5** | Set **NEXTAUTH_URL** in Vercel to your exact live URL (e.g. `https://your-project.vercel.app`), then **Redeploy** (Step 5). |
| **6** | Open your site; use `/broadcast?secret=YOUR_BROADCAST_SECRET` to share location. |

If anything fails, check **Troubleshooting** at the bottom.

---

## What you need

- A **GitHub** account (free): https://github.com/join  
- A **Vercel** account (free): https://vercel.com/signup  
- A **Neon** account (free): https://neon.tech (for the database)

---

## Step 1: Put your project on GitHub

1. Go to **https://github.com** and log in.
2. Click the **+** (top right) → **New repository**.
3. Name it e.g. **paris-tallinn-voistlus**.
4. Leave “Public” selected. **Do not** check “Add a README”.
5. Click **Create repository**.
6. Open **Terminal** on your computer (same place you ran `npm run dev` before).
7. Run these commands **one by one** (replace `YOUR_USERNAME` with your GitHub username):

```bash
cd "/Users/stivenraidmets/euroopa website"
git init
git add .
git commit -m "First commit"
git branch -M main
git remote remove origin
git remote add origin https://github.com/stivenraidmets-glitch/Sisuloojad-euroopas.git
git push -u origin main
```

**If Git asks for a password:** GitHub no longer accepts your account password. You must use a **Personal Access Token**:
1. On GitHub: your profile picture (top right) → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**. Name it e.g. “push”, tick **repo**, then **Generate**. Copy the token (starts with `ghp_`).
2. When Terminal asks for “Password:”, **paste that token** (nothing will show as you paste). Press Enter. Username is `stivenraidmets-glitch`.

---

## Step 2: Create a free database (Neon)

1. Go to **https://neon.tech** and sign up (free).
2. Click **Create a project**.
3. Name it e.g. **voistlus**, choose a region (e.g. EU).
4. Click **Create project**.
5. On the next screen you’ll see a **connection string** like:
   `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
6. Click **Copy** and save it somewhere (you’ll need it in Step 4). This is your **DATABASE_URL**.

---

## Step 3: Deploy on Vercel

1. Go to **https://vercel.com** and log in (use “Continue with GitHub”).
2. Click **Add New…** → **Project**.
3. You should see your repo **paris-tallinn-voistlus**. Click **Import** next to it.
4. Leave **Framework Preset** as Next.js. Don’t change the **Root Directory**.
5. **Before** clicking Deploy, open **Environment Variables** and add these (click “Add” for each):

| Name | Value |
|------|--------|
| `DATABASE_URL` | The long Neon connection string you copied (starts with `postgresql://`) |
| `NEXTAUTH_URL` | `https://your-project-name.vercel.app` (replace with the name you’ll get; or use the placeholder and change it after first deploy) |
| `NEXTAUTH_SECRET` | Any long random string, e.g. paste from https://generate-secret.vercel.app/32 |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Your Mapbox token (pk.eyJ...) |
| `ADMIN_EMAILS` | Your email, e.g. stivenraidmets@gmail.com |
| `BROADCAST_SECRET` | Optional. A secret word for the broadcast URL. If not set, use `?secret=broadcast` in the broadcast link. |
| `EMAIL_SERVER` | **For magic link login.** SMTP URL, e.g. Resend: `smtp://resend:YOUR_RESEND_API_KEY@smtp.resend.com:465` (see “Magic link login” below). |
| `EMAIL_FROM` | **For magic link login.** Sender address, e.g. `noreply@yourdomain.com` (must be allowed by your email provider). |
| `ENABLE_DEV_LOGIN` | Leave empty (delete or leave blank in production) |
| `NEXT_PUBLIC_ENABLE_DEV_LOGIN` | Leave empty |

You can add **Stripe** and **Pusher** later; the site will work without them (map and broadcast will work).

6. Click **Deploy**.
7. Wait 1–2 minutes. When it’s done, you’ll get a link like **https://paris-tallinn-voistlus.vercel.app**.

---

## Step 4: Create tables and seed data in Neon

The app is already set to use PostgreSQL. You only need to create the tables and seed data in your Neon database **once**.

1. Open **Terminal** and go to your project folder.
2. Set your Neon connection string (paste the **exact** URL from Neon; it usually ends with `?sslmode=require`):

```bash
cd "/Users/stivenraidmets/euroopa website"
export DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
```

(Replace the whole `postgresql://...` part with what you copied from Neon.)

3. Create the tables:

```bash
npx prisma db push
```

You should see something like: “Database is now in sync with your schema.”

4. Add the default teams and options (seed):

```bash
npx prisma db seed
```

You should see: “Seed completed” or similar.

5. **Optional:** Put the same `DATABASE_URL` in a file named `.env` or `.env.local` in your project folder (one line: `DATABASE_URL="postgresql://..."`) so local `npm run dev` uses the same database.

6. If you changed any code, commit and push so Vercel has the latest:

```bash
git add .
git commit -m "Deploy with Postgres"
git push
```

Vercel will redeploy automatically. After 1–2 minutes, open your **.vercel.app** link.

---

## Magic link (email) login

For “Saada magilink” to work, the app must be able to send email. Add these in Vercel → Environment Variables, then redeploy:

1. **EMAIL_SERVER** – SMTP URL. Example with **Resend** (free tier):
   - Sign up at https://resend.com and get an API key.
   - In Resend, add and verify a domain (or use their test domain for development).
   - Set: `EMAIL_SERVER=smtp://resend:YOUR_RESEND_API_KEY@smtp.resend.com:465`
   - Set: `EMAIL_FROM=onboarding@resend.dev` (or your verified sender, e.g. `noreply@yourdomain.com`).

2. **EMAIL_FROM** – The “From” address. It must be a sender your provider allows (Resend: use their test domain or your verified domain).

3. **Redeploy** after adding the variables. Then try “Saada magilink” again; the login page will show “Magilink pole seadistatud” until `EMAIL_SERVER` is set.

---

## Step 5: Set NEXTAUTH_URL on Vercel

1. In Vercel, open your project → **Settings** → **Environment Variables**.
2. Find **NEXTAUTH_URL** and set it to your **exact** live URL, e.g.  
   `https://paris-tallinn-voistlus.vercel.app`  
   (no slash at the end).
3. Save. Then go to **Deployments** → click the **⋯** on the latest deployment → **Redeploy** (so the new URL is used).

---

## You’re done

- **Visit:** https://your-project-name.vercel.app  
- **Broadcast from phone:** use the same URL:  
  `https://your-project-name.vercel.app/broadcast?secret=MY_SECRET`  
  If you didn’t set `BROADCAST_SECRET` in Vercel, use `?secret=broadcast`. Otherwise use the same value as `BROADCAST_SECRET`.

Share the main link with visitors; they can vote, watch the map, and spin the wheel.

---

## Add a custom domain later (e.g. zone.ee)

When you’re ready and have a domain (e.g. from Zone.ee):

1. In **Vercel** → your project → **Settings** → **Domains**.
2. Add your domain (e.g. `voistlus.ee` or `race.yourdomain.ee`).
3. Vercel will show you what to set at your domain registrar (e.g. Zone.ee): usually an **A** record or **CNAME** (Vercel shows the exact values).
4. In Zone.ee (or wherever you bought the domain), add that A or CNAME record.
5. Back in Vercel, set **NEXTAUTH_URL** to `https://yourdomain.ee` and redeploy.

You keep hosting on Vercel; the domain just points to it. No need to pay for Zone’s hosting—only for the domain name if you want one.

---

## Troubleshooting

| Problem | What to do |
|--------|------------|
| “Invalid `prisma.db`” or DB errors | Make sure you ran Step 4: `provider = "postgresql"` in schema, then `prisma db push` and `prisma db seed` with `DATABASE_URL` set to Neon. Then push and let Vercel redeploy. |
| Login doesn’t work | Set **NEXTAUTH_URL** in Vercel to your exact live URL (with https://). Redeploy. |
| Map doesn’t show | Add **NEXT_PUBLIC_MAPBOX_TOKEN** in Vercel env vars and redeploy. |
| 500 error on first open | Often the database: run `prisma db push` and `prisma db seed` with Neon URL, then push and redeploy. |
| “Application error: a server-side exception” | Often the database: (1) Set **DATABASE_URL** in Vercel to the **same** Neon connection string you used when you ran `prisma db push` and `prisma db seed`. (2) If the host in the error is different, replace it in Vercel with the working Neon URL. (3) Set **NEXTAUTH_SECRET** and **NEXTAUTH_URL** too, then redeploy. |

If something doesn’t work, copy the error message (from the browser or Vercel deployment log) and ask for help—mention you followed GET-IT-ONLINE.md.

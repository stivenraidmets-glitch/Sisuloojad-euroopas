# Simple instructions – get the site working

Do these in order. Use **one** Neon database for everything.

---

## 1. Create the database (Neon)

1. Go to **https://neon.tech** and sign in.
2. Click **New Project**. Name it (e.g. voistlus), region **EU**. Create.
3. On the project page, find **Connection string** and click **Copy**.
4. Save it somewhere – you need it in step 2 and step 4.

---

## 2. Add the database URL in Vercel

1. Go to **https://vercel.com** → your project (e.g. Sisuloojad-euroopas).
2. Open **Settings** → **Environment Variables**.
3. Find **DATABASE_URL**. If it exists, edit it. If not, add it.
4. Paste the **exact** connection string you copied from Neon (the long line starting with `postgresql://`).
5. Save. Then go to **Deployments** → click **⋯** on the latest one → **Redeploy**.

---

## 3. Create tables in the database (one time)

1. On your computer, open **Terminal**.
2. Go to the project folder and set the same Neon URL, then run two commands.

Replace `PASTE_NEON_URL_HERE` with your real Neon connection string.

```bash
cd "/Users/stivenraidmets/euroopa website"
export DATABASE_URL="PASTE_NEON_URL_HERE"
npx prisma db push
npm run db:seed
```

3. When both finish without errors, the database is ready.

---

## 4. Set these in Vercel (Settings → Environment Variables)

| Name              | What to put |
|-------------------|-------------|
| **DATABASE_URL**  | Same Neon connection string as in step 3. |
| **NEXTAUTH_URL**  | Your site URL, e.g. `https://sisuloojad-euroopas.vercel.app` (no slash at end). |
| **NEXTAUTH_SECRET** | Any long random text. You can use https://generate-secret.vercel.app/32 and paste the result. |
| **NEXT_PUBLIC_MAPBOX_TOKEN** | Your Mapbox token (starts with `pk.eyJ...`). |
| **ENABLE_DEV_LOGIN** | `1` (enables “Logi sisse kui test@test.com” with password `dev`). |
| **NEXT_PUBLIC_ENABLE_DEV_LOGIN** | `1` (shows the dev login button on the login page). |

Save, then **Redeploy** again.

**Login:** Magic-link login only works if you add **EMAIL_SERVER** and **EMAIL_FROM** (e.g. Resend, SendGrid). To log in without email, set **ENABLE_DEV_LOGIN** and **NEXT_PUBLIC_ENABLE_DEV_LOGIN** to `1` in Vercel, redeploy, then use the button on the login page with **test@test.com** / **dev**.

**Optional – Stripe (penalty shop payments):** To accept real payments when users buy penalties, add **STRIPE_SECRET_KEY** and **STRIPE_WEBHOOK_SECRET** in Vercel. Full steps: see **STRIPE-CONFIG.md**.

---

## 5. Open your site

- Main site: **https://sisuloojad-euroopas.vercel.app** (or your Vercel URL).
- Share GPS from phone: **https://sisuloojad-euroopas.vercel.app/broadcast?secret=broadcast**

On the broadcast page: allow location, choose team, tap “Alusta asukoha jagamist”.

---

## If something breaks

- **“Application error” or “table does not exist”**  
  → DATABASE_URL in Vercel must be the **same** Neon URL you used in step 3. Fix it and redeploy.

- **“Failed to update location”**  
  → Same thing: check DATABASE_URL in Vercel and that you ran step 3 with that URL.

- **“Invalid secret”**  
  → Use this exact URL: `.../broadcast?secret=broadcast`

- **Map is empty**  
  → Add **NEXT_PUBLIC_MAPBOX_TOKEN** in Vercel and redeploy.

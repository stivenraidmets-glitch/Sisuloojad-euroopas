# Hosting on Zone.ee

This guide helps you host the Paris → Tallinn võistlus app on **Zone.ee** (domain + hosting). Zone.ee offers **web hosting with Node.js** and **VPS (CloudServer)**. Both can run this Next.js app.

---

## Option A: Zone.ee Web hosting (Node.js)

Zone’s shared hosting can run Node.js apps. You upload the built app and configure a port.

### 1. Prepare the app for production

**On your computer:**

```bash
# Use PostgreSQL in production (recommended). Set DATABASE_URL to a cloud Postgres:
# e.g. Neon (neon.tech), Supabase, or Railway – they give you a connection string.

# Build the app
npm run build
```

Your app must listen on a **port** that Zone assigns. Next.js uses the `PORT` environment variable. Zone often expects the app to listen on a port you set in the control panel (e.g. 8080 or a “loopback” port).

Create a small start script so the app uses that port. In `package.json` you already have:

```json
"start": "next start"
```

Next.js will use `process.env.PORT` or default 3000. On Zone you’ll set the port in the control panel and set the same value in your env (see below).

### 2. Database (important)

Zone shared hosting usually does **not** offer PostgreSQL. Use a **free external database**:

- **[Neon](https://neon.tech)** – free Postgres, get a connection string.
- **[Supabase](https://supabase.com)** – free Postgres + optional auth.
- **[Railway](https://railway.app)** – free tier Postgres.

Then:

1. In **Prisma**: switch production to Postgres (see “Production: use PostgreSQL” below).
2. Set **DATABASE_URL** on Zone to that connection string (e.g. `postgresql://user:pass@host/db?sslmode=require`).

If you don’t need a cloud DB and your Zone plan allows writable files, you can try **SQLite** and set e.g. `DATABASE_URL="file:./prisma/prod.db"` and run migrations on the server once. Backup is then your responsibility.

### 3. Upload and run on Zone

1. **Upload** the built app to your domain folder (WebFTP, FTP, or SSH):
   - Upload the whole project **or** at least: `.next`, `node_modules`, `package.json`, `prisma`, `public`, and any files Next needs at runtime.
   - Simpler: upload full project (without `node_modules`), then run `npm install --production` and `npm run build` over **SSH** if Zone gives you shell access.

2. **Environment variables**  
   In Zone’s control panel (Webhosting → your domain → environment / config), set at least:

   - `NODE_ENV=production`
   - `PORT=<port Zone tells you>` (e.g. 8080)
   - `DATABASE_URL=<your Postgres or file path>`
   - `NEXTAUTH_URL=https://yourdomain.ee` (your Zone.ee domain)
   - `NEXTAUTH_SECRET=<long random string>`
   - `NEXT_PUBLIC_MAPBOX_TOKEN=<your token>`
   - `ADMIN_EMAILS=<your email>`
   - `BROADCAST_SECRET=<secret for /broadcast>`
   - Optional: Stripe, Pusher, `EMAIL_SERVER`, `EMAIL_FROM`

   If Zone doesn’t support env vars in the panel, put them in a `.env` file in the project root on the server (and keep that file out of public access).

3. **Port and mod_proxy**  
   - In Zone: **Webhosting → Main domain (or subdomain) → mod_proxy / backend port** (or similar), enter the port your app listens on (e.g. 8080).
   - Make sure your app really listens on that port (via `PORT` env).

4. **Process manager (if available)**  
   If you have SSH, use **PM2** so the app restarts after crashes:

   ```bash
   npm install -g pm2
   pm2 start npm --name "voistlus" -- start
   pm2 save
   pm2 startup
   ```

5. **Prisma (migrations and generate)**  
   Over SSH in the project folder:

   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

6. **Domain**  
   Point your **zone.ee** domain to this hosting (Zone usually does this automatically when you assign the domain to the hosting).

---

## Option B: Zone.ee VPS (CloudServer)

With a **VPS** you have full control (like your own Linux server).

### 1. Server setup

- Order a [CloudServer VPS](https://www.zone.ee/en/cloud-server/vps/) from Zone.ee.
- Connect via SSH. Install Node.js (Zone often has it; otherwise use `nvm` and install LTS).
- Install PM2: `npm install -g pm2`.

### 2. Deploy the app

- Clone your repo or upload the project (e.g. with `git clone` or rsync).
- Create `.env` with the same variables as above; set `NEXTAUTH_URL=https://yourdomain.ee` and `PORT=3000` (or 80 if you reverse-proxy).

```bash
cd /path/to/your/app
npm install
npm run build
npx prisma generate
npx prisma db push
npx prisma db seed
pm2 start npm --name "voistlus" -- start
pm2 save
pm2 startup
```

### 3. Reverse proxy (HTTPS + domain)

- Install **Nginx** (or Caddy): e.g. `apt install nginx`.
- Get a free SSL certificate (e.g. **Let’s Encrypt** with `certbot`).
- Configure Nginx to proxy `https://yourdomain.ee` to `http://127.0.0.1:3000` (or whatever port the app uses).

Example Nginx server block (replace `yourdomain.ee` and port if needed):

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.ee www.yourdomain.ee;
    ssl_certificate /etc/letsencrypt/live/yourdomain.ee/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.ee/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Point zone.ee domain to the VPS

- In Zone.ee domain management, set **A (and/or AAAA)** record for `yourdomain.ee` to the VPS IP address.

---

## Production: use PostgreSQL

For production you should use **PostgreSQL** (e.g. Neon/Supabase) instead of SQLite.

1. In `prisma/schema.prisma`:
   - Change `provider = "sqlite"` to `provider = "postgresql"`.
   - Set `url = env("DATABASE_URL")` (and remove the `file:./dev.db` SQLite url).

2. Set **DATABASE_URL** to your Postgres connection string (with `?sslmode=require` if required).

3. Run migrations on the server (or in CI) after deploy:

   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

---

## Checklist for Zone.ee

- [ ] Domain at Zone.ee pointed to your hosting (A record or Zone’s hosting).
- [ ] `NEXTAUTH_URL` = `https://yourdomain.ee` (no trailing slash).
- [ ] `NEXTAUTH_SECRET` = long random string.
- [ ] `DATABASE_URL` = Postgres URL (or SQLite path if you use file DB).
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` set.
- [ ] `ADMIN_EMAILS` and `BROADCAST_SECRET` set.
- [ ] Magic link email: `EMAIL_SERVER` and `EMAIL_FROM` (e.g. Zone mail or Resend/SendGrid).
- [ ] Stripe webhook URL: `https://yourdomain.ee/api/stripe/webhook`.
- [ ] App listens on the port Zone expects; mod_proxy (shared) or Nginx (VPS) forwards to it.
- [ ] PM2 or similar keeps the Node process running (VPS or SSH on shared).

If you tell me whether you use **shared hosting** or **VPS** and your exact Zone.ee product name, I can adapt these steps (e.g. exact panel names and port setup) to match Zone’s current interface.

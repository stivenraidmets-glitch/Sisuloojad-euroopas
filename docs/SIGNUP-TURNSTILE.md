# Registreerumine ja Turnstile

Sisselogimine toimub **ainult e-maili ja parooliga**. Registreerumisel on vaja **Cloudflare Turnstile** (“kas oled inimene?”) võtit.

## Vercel / keskkonna muutujad

1. Ava [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Turnstile** → **Add widget**.
2. Lisa domeen (nt `sisuloojad-euroopas.vercel.app` ja `localhost` arenduseks).
3. Kopeeri **Site key** → Vercelisse `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
4. Kopeeri **Secret key** → Vercelisse `TURNSTILE_SECRET_KEY`.
5. **Redeploy** pärast env muudatust.

Arenduses töötavad ka [testvõtmed](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) (kood kasutab neid automaatselt, kui `TURNSTILE_SECRET_KEY` puudub).

## Andmebaas

Pärast `schema` muudatust käivita:

```bash
npx prisma db push
```

## Varasemad kontod (ilma paroolita)

Kontod, mis loodi vana **magilinki** süsteemiga, ei ole parooli välja. Need ei saa uue süsteemiga sisse logida, kuni neile on määratud `passwordHash` (nt admin skriptiga või uus konto teise e-mailiga).

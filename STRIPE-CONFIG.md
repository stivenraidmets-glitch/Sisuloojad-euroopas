# Stripe configuration (penalty shop payments)

The app uses Stripe for one-time payments when users buy penalties. Configure it once in Stripe and in Vercel.

---

## 1. Create a Stripe account

1. Go to **https://dashboard.stripe.com** and sign up or log in.
2. Complete account setup if prompted (you can use **Test mode** first – toggle in the dashboard).

---

## 2. Get your Secret Key

1. In Stripe Dashboard go to **Developers** → **API keys**.
2. Under **Standard keys**, copy the **Secret key** (starts with `sk_test_` in test mode or `sk_live_` in live mode).
3. You will add this as **STRIPE_SECRET_KEY** in Vercel (never commit it to git).

---

## 3. Create a webhook (so payments complete the purchase)

1. In Stripe Dashboard go to **Developers** → **Webhooks**.
2. Click **Add endpoint**.
3. **Endpoint URL:**  
   `https://sisuloojad-euroopas.vercel.app/api/stripe/webhook`  
   (replace with your real Vercel URL if different.)
4. Click **Select events** and choose: **checkout.session.completed**.
5. Click **Add endpoint**.
6. On the new webhook’s page, open **Signing secret** and click **Reveal**. Copy the value (starts with `whsec_`).
7. You will add this as **STRIPE_WEBHOOK_SECRET** in Vercel.

---

## 4. Add environment variables in Vercel

1. Go to **https://vercel.com** → your project → **Settings** → **Environment Variables**.
2. Add:

| Name | Value |
|------|--------|
| **STRIPE_SECRET_KEY** | The Secret key from step 2 (e.g. `sk_test_...` or `sk_live_...`) |
| **STRIPE_WEBHOOK_SECRET** | The Signing secret from step 3 (e.g. `whsec_...`) |

3. Save.
4. Go to **Deployments** → **⋯** on the latest deployment → **Redeploy**.

---

## 5. Test (Test mode)

1. In Stripe Dashboard, ensure **Test mode** is ON (toggle top-right).
2. Use test card **4242 4242 4242 4242**, any future expiry, any CVC.
3. On your site, log in, go to the penalty shop, buy a penalty. You should be redirected to Stripe Checkout and back; the purchase should appear as completed and the penalty created.

---

## 6. Go live (optional)

1. In Stripe, complete account activation and switch to **Live mode**.
2. Replace **STRIPE_SECRET_KEY** in Vercel with your **live** Secret key (`sk_live_...`).
3. In Stripe **Developers** → **Webhooks**, add a **new** endpoint with the same URL and event (**checkout.session.completed**), then set **STRIPE_WEBHOOK_SECRET** in Vercel to this new endpoint’s signing secret.
4. Redeploy.

---

## Summary – required in Vercel

| Variable | Where to get it |
|----------|------------------|
| **STRIPE_SECRET_KEY** | Stripe Dashboard → Developers → API keys → Secret key |
| **STRIPE_WEBHOOK_SECRET** | Stripe Dashboard → Developers → Webhooks → [your endpoint] → Signing secret |

Without these, the penalty shop will return “Stripe is not configured” when users try to pay. The rest of the site works without Stripe.

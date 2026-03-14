# iPhone Shortcut: Send location to the map

You can mirror your iPhone location to the race map **without opening the broadcast page**, using a Shortcut that calls the broadcast API with your current location.

## 1. Get your URL and secret

- **Base URL:** Your live site, e.g. `https://your-app.vercel.app`
- **Secret:** Use `broadcast` (default), or the value of `BROADCAST_SECRET` in Vercel if you set one.
- **Team ID:** `1`, `2`, or `3` (Kozip = 1, Stiven ja Sidni = 2, Gepu ja Kris = 3).

## 2. Create the Shortcut

1. Open **Shortcuts** on your iPhone.
2. Tap **+** to create a new shortcut.
3. Add these actions in order:

   **Step 1 – Get location**
   - Add action: **“Get Current Location”**
   - Leave settings as default (e.g. “Ask Each Time” or “Never” if you want no prompt).

   **Step 2 – Send to API**
   - Add action: **“Get Contents of URL”**
   - Set **URL** to (replace with your real values):
     ```
     https://YOUR-DOMAIN.com/api/broadcast?lat=[Latitude]&lng=[Longitude]&teamId=1&secret=broadcast
     ```
   - In the URL field, tap **[Latitude]** and choose **Latitude** from the output of “Get Current Location”.
   - Tap **[Longitude]** and choose **Longitude** from “Get Current Location”.
   - Change `teamId=1` to `2` or `3` if you’re a different team.
   - If you use a custom secret, change `secret=broadcast` to `secret=YOUR_SECRET`.
   - Set **Method** to **GET** (default for “Get Contents of URL”).

   **Step 3 (optional) – Feedback**
   - Add action: **“Show Result”** and pass the **Contents of URL** from step 2, so you see “success” or an error.

4. Name the shortcut (e.g. **“Send location to map”**) and tap **Done**.

## 3. Run it

- Open **Shortcuts** and tap the shortcut, or add it to the home screen / widget.
- When you run it, the app will get your current location and send it to the map. The map updates live (and distance / country unlocks work as on the broadcast page).

## 4. Optional: run automatically

- In the Shortcut, add **“Run Shortcut”** or use **Automation** (Settings → Shortcuts → Automation) to run this shortcut:
  - **When leaving a location**, or  
  - **At a time interval** (e.g. every 15–30 minutes).

## Example URL (replace placeholders)

```
https://your-app.vercel.app/api/broadcast?lat=40.4168&lng=-3.7038&teamId=1&secret=broadcast
```

- Same **5 second rate limit** per team as the broadcast page.
- If you set **BROADCAST_SECRET** in Vercel, use that value instead of `broadcast` in the URL and keep it private.

# Healthy Life Center — storefront + admin

## Files

- `index.html` — the public storefront. Product catalog, cart, WhatsApp checkout, a customer-service/contact form, and the PWA install prompt.
- `admin.html` — private dashboard: analytics, product management, and customer messages. Not linked from the storefront — keep this URL to yourselves (e.g. `yoursite.com/admin.html`).
- `privacy.html` / `terms.html` — linked in the storefront footer.
- `supabase-schema.sql` — sets up the database tables and storage bucket.
- `manifest.json`, `sw.js`, `icon.svg` — make the storefront installable as an app (PWA).
- `og-image.png` — the image shown when the storefront link is shared on WhatsApp, Facebook, etc.
- `api/send-notification.js` — the one piece of server code in this project. Sends push announcements when the admin hits "Send" — static HTML alone can't do this part.
- `package.json` — tells Vercel which small libraries that function needs (`web-push`, `@supabase/supabase-js`). You don't run anything locally; Vercel installs these automatically when it deploys.
- `.env.example` / `vapid-keys.txt` — the keys the push feature needs. See §13 below.

Almost everything is plain HTML/CSS/JS — no build step, no local npm install. The one exception is `api/send-notification.js` (push announcements): Vercel installs its two small dependencies automatically from `package.json` at deploy time. You still don't run anything locally.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. **SQL Editor → New query**, paste in `supabase-schema.sql`, run it. This creates:
   - `products` — the catalog
   - `inquiries` — customer-service / complaint submissions
   - `page_views` — for the admin analytics tab
   - `orders` — logged automatically at checkout
   - the `product-images` storage bucket
   - If the storage bucket insert fails on your plan, create it manually instead: **Storage → New bucket** → name `product-images` → **Public bucket: ON**.
   - The whole file is safe to paste and run again later (e.g. after I add a new table) — it won't error on tables, policies, or the bucket that already exist.
3. **Project Settings → API** → copy the **Project URL** and **anon public** key.

## 2. Create the admin login

1. **Authentication → Users → Add user** (create manually).
2. Enter the admin's email and password.
3. That's the login for `admin.html`. Add more admin users the same way later.

## 3. Fill in the config

Near the top of the `<script>` in **both** `index.html` and `admin.html`:

```js
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
```

In `index.html` only, also check/update:

```js
const WHATSAPP_NUMBER = "231770523365"; // 0770523365 with Liberia's country code
const CURRENCY_SYMBOL = "$";
const SOCIAL_LINKS = { instagram: "...", facebook: "...", tiktok: "..." };
```

The secondary number (0888360044) is already wired up in the footer as a tap-to-call link — update it there if it changes.

## 4. Add products

Open `admin.html` → **Products** tab → add name, category, price, an image (uploads straight to Supabase Storage), the brief/description, and usage instructions. Use **Mark sold out** on any row to hide the "Add to cart" button on the storefront without deleting the product — flip it back with **Mark in stock** any time.

Changes appear on the storefront immediately, no redeploy needed.

## 5. Customer messages

The storefront has a "Contact us" button (and a floating Help button) with a short form for anything a customer can't find, or a complaint. Submissions land in the admin **Customer messages** tab, newest first, with a **Mark resolved** action. Customers who'd rather message directly can still tap WhatsApp from the same form.

## 6. Orders

Every time a customer taps **Checkout on WhatsApp**, the order (items, quantities, total) is logged automatically to the `orders` table — no extra step for the customer. The admin **Orders** tab shows orders today/this week, total revenue, and a recent-orders table, with a CSV export. This is a log for your records, not a payment system: nothing here charges the customer or blocks checkout if logging fails.

## 7. Search & out-of-stock follow-up

- Customers can search the catalog by name, category, or description using the search bar above the category tabs.
- A sold-out product shows a **Notify me** button instead of a dead "Add to cart" — it opens WhatsApp with a prefilled message naming the product, so you get a direct ping when someone wants a restock alert.

## 8. Analytics

The admin **Analytics** tab shows views today, this week, all-time, a 7-day bar chart, and the count of new (unresolved) customer messages. It's intentionally simple — one row logged per storefront visit, no cookies or personal tracking involved.

## 9. Legal pages

`privacy.html` and `terms.html` are linked in the storefront footer with placeholder text written for this kind of business (WhatsApp checkout, herbal products, delivery). Read through both and adjust anything that doesn't match how the business actually operates before publishing — this isn't a substitute for legal advice, especially around health-product claims.

## 10. Installable app (PWA)

`manifest.json` + `sw.js` + `icon.svg` let customers install the storefront to their home screen like an app.

- **Android / Chrome / Edge**: a slim "Install Healthy Life Center" banner appears automatically after a visitor browses for a bit; tapping **Install** adds it to their home screen. Dismissing it hides it for that visitor going forward.
- **iOS Safari**: Apple doesn't allow that automatic prompt. iPhone users install manually via **Share → Add to Home Screen** — worth a line on your social pages or a WhatsApp broadcast if that matters to you.
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, and `apple-touch-icon.png` are already generated and included — no extra steps needed there.
- `sw.js` only caches the app shell (HTML/manifest/icons) for fast repeat loads — it never caches product data, so stock and prices are always current.
- If the install prompt still isn't showing after deploying, see the troubleshooting notes at the bottom of this README.

**Note:** the install prompt and service worker only work once the site is served over `https://` (or `localhost` while testing) — they won't activate if you just double-click `index.html` on your computer.

## 11. Share previews

`og-image.png` (1200×630) is what shows up when someone pastes the storefront link into WhatsApp, Facebook, or Twitter/X, driven by the `og:` and `twitter:` meta tags at the top of `index.html`. If you rebrand later (colors, name), regenerate this image to match — it won't update on its own.

## 13. Push notifications (admin announcements)

Lets you send a notification straight to customers' phones — even if they don't have the site open — for things like "New stock: Fertility Tea back today!" This is the one feature in this project that needs real server-side code, because sending a push requires a private key that can never sit in a browser.

**How it works:**
- A customer taps **"Get notified about new products"** in the storefront footer, allows the browser's notification permission prompt once, and their device is saved to the `push_subscriptions` table.
- You write a title + short message in admin's new **Announcements** tab and hit **Send to all subscribers**.
- That calls `api/send-notification.js`, which sends the push to everyone subscribed and quietly removes any subscriptions that have gone stale (e.g. someone uninstalled).

**Setup (one time):**
1. In your **Vercel project → Settings → Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | `https://fynvgznbxkohscslrjxg.supabase.co` |
   | `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5bnZnem5ieGtvaHNjc2xyanhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNDcwNDQsImV4cCI6MjEwNTcyMzA0NH0.ErH6-ps5Rt4FA39kzbwNSqobWEKrjuI0wAQ4mLVk5Z8` |
   | `VAPID_PUBLIC_KEY` | `BLcyQDI2iLDPG-J_wEYWt509V8NrWwaubmxXMW8AcS6Gr1Xz8K9qLT51_pqsPp5LmHt7hLJxCeibrccsJ1AJzyQ` |
   | `VAPID_PRIVATE_KEY` | `NcISpfBefH1o05jcYQv4ctLEvfNIihmpEbC8jdBdDyM` |
   | `VAPID_SUBJECT` | `mailto:iboiblessed1@gmail.com` |

   These two VAPID keys are a matched pair (also saved in `vapid-keys.txt`) — the public half is already hardcoded in `index.html`'s script. If you ever regenerate one side, you must update the other to match, or customer subscriptions will silently stop working. The private key is a real secret — it only ever goes into Vercel's environment variables, never into a file you commit or share further.
2. Re-run `supabase-schema.sql` (safe to re-run — see §1) to add the `push_subscriptions` table.
3. Redeploy on Vercel so it picks up `api/send-notification.js` and installs `web-push`.
4. Test it: open the storefront, tap the notify link in the footer, allow notifications, then send yourself a test announcement from admin.

**Limits worth knowing:**
- **iPhone**: push notifications only work if the customer already installed the site to their home screen (Share → Add to Home Screen) and has iOS 16.4+. A plain Safari tab can't receive them — this is Apple's rule, not ours.
- There's no character-count enforcement beyond the form's `maxlength`, but short titles/messages display best — most phones truncate long notification text.
- This sends to *everyone* subscribed at once. There's no per-customer or per-category targeting (e.g. "only fertility-tea customers") — a reasonable next step if you want it later.

## 14. Deploy

Drop every file in this folder into a static host that supports serverless functions — [Vercel](https://vercel.com) is what this project is set up for. No build command to configure; Vercel auto-detects `api/send-notification.js` and installs its dependencies from `package.json`. Deploy the folder as-is, all files at the same level (so `manifest.json`, `sw.js`, the icon files, and `og-image.png` sit next to `index.html`, and `api/` stays as its own folder).

Give customers the storefront link. Keep `/admin.html` private.

## How checkout works

A customer adds items to the cart, taps **Checkout on WhatsApp**, and WhatsApp opens with every item, quantity, and the total pre-filled, addressed to your WhatsApp number. You confirm availability, price, and delivery directly in that chat. The order is also logged automatically (see §6) so the admin dashboard can show you sales numbers — but nothing here processes payment; money still changes hands however you currently arrange it (cash on delivery, mobile money, etc.).

## CSV exports

The admin dashboard's **Orders**, **Products**, and **Customer messages** tabs each have an **Export CSV** button — useful for backups, sharing numbers with the client, or opening in Excel/Sheets.

## Further customization

- Colors/fonts/spacing: the `:root` CSS variables at the top of each `<style>` block.
- If you later want true in-app payment instead of the WhatsApp handoff, that's a bigger addition (a payment gateway integration) — not included here.

## Troubleshooting: install prompt not showing

1. Confirm the latest `manifest.json`, `sw.js`, `index.html`, and the icon PNG files are actually deployed (check the deployment timestamp in Vercel).
2. Run your live URL through [pagespeed.web.dev](https://pagespeed.web.dev) and check the installability notes — it will name the exact missing requirement, if any.
3. If you ever added the site as a shortcut manually before, remove that icon and clear site data for the domain in your browser first — otherwise it may think it's "already handled" and skip the real prompt.
4. The install prompt and push notifications both require real engagement time on the page (a few seconds of browsing) before the browser offers them — they won't fire the instant the page loads.

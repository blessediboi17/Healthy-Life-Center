# Healthy Life Center — storefront + admin

## Files

- `index.html` — the public storefront. Product catalog, cart, WhatsApp checkout, a customer-service/contact form, and the PWA install prompt.
- `admin.html` — private dashboard: analytics, product management, and customer messages. Not linked from the storefront — keep this URL to yourselves (e.g. `yoursite.com/admin.html`).
- `privacy.html` / `terms.html` — linked in the storefront footer.
- `supabase-schema.sql` — sets up the database tables and storage bucket.
- `manifest.json`, `sw.js`, `icon.svg` — make the storefront installable as an app (PWA).
- `og-image.png` — the image shown when the storefront link is shared on WhatsApp, Facebook, etc.

Everything is plain HTML/CSS/JS — no build step, no npm install. Edit and deploy as static files.

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
- For best icon quality on all devices, export `icon.svg` as `icon-192.png` and `icon-512.png` (any online SVG-to-PNG converter works) and place them next to it — `manifest.json` already references them as fallbacks.
- `sw.js` only caches the app shell (HTML/manifest/icon) for fast repeat loads — it never caches product data, so stock and prices are always current.

**Note:** the install prompt and service worker only work once the site is served over `https://` (or `localhost` while testing) — they won't activate if you just double-click `index.html` on your computer.

## 11. Share previews

`og-image.png` (1200×630) is what shows up when someone pastes the storefront link into WhatsApp, Facebook, or Twitter/X, driven by the `og:` and `twitter:` meta tags at the top of `index.html`. If you rebrand later (colors, name), regenerate this image to match — it won't update on its own.

## 12. Deploy

Drop every file in this folder into a static host — [Vercel](https://vercel.com), Netlify, GitHub Pages, etc. No framework, no build command. Deploy the folder as-is, all files at the same level (so `manifest.json`, `sw.js`, `icon.svg`, and `og-image.png` sit next to `index.html`).

Give customers the storefront link. Keep `/admin.html` private.

## How checkout works

A customer adds items to the cart, taps **Checkout on WhatsApp**, and WhatsApp opens with every item, quantity, and the total pre-filled, addressed to your WhatsApp number. You confirm availability, price, and delivery directly in that chat. The order is also logged automatically (see §6) so the admin dashboard can show you sales numbers — but nothing here processes payment; money still changes hands however you currently arrange it (cash on delivery, mobile money, etc.).

## CSV exports

The admin dashboard's **Orders**, **Products**, and **Customer messages** tabs each have an **Export CSV** button — useful for backups, sharing numbers with the client, or opening in Excel/Sheets.

## Further customization

- Colors/fonts/spacing: the `:root` CSS variables at the top of each `<style>` block.
- If you later want true in-app payment instead of the WhatsApp handoff, that's a bigger addition (a payment gateway integration) — not included here.

// Vercel serverless function — POST /api/send-notification
// Called only from admin.html. Sends a push notification to every customer
// who opted in. Uses the admin's own logged-in session (not a separate
// master key) to read the subscriber list, so only a logged-in admin can
// ever trigger a send — enforced by Supabase row-level security.

const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { title, message, url, accessToken } = body || {};

  if (!title || !message) {
    res.status(400).json({ error: "title and message are required" });
    return;
  }
  if (!accessToken) {
    res.status(401).json({ error: "Missing admin session — please log in again and retry." });
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:healthylifecenter12@gmail.com";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    res.status(500).json({ error: "Server is missing required environment variables. Check the README." });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });

  // Confirm this is really a logged-in admin, not just someone with the public anon key
  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData || !userData.user) {
    res.status(401).json({ error: "Not authorized — please log in to the admin dashboard again." });
    return;
  }

  const { data: subs, error: subsErr } = await supabase.from("push_subscriptions").select("*");
  if (subsErr) {
    res.status(500).json({ error: subsErr.message });
    return;
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const payload = JSON.stringify({
    title,
    message,
    url: url || "./"
  });

  let sentCount = 0;
  const deadEndpoints = [];

  await Promise.all((subs || []).map(async (sub) => {
    const subscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
    try {
      await webpush.sendNotification(subscription, payload);
      sentCount++;
    } catch (err) {
      // 404/410 = this subscription no longer exists on the browser's end — clean it up
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        deadEndpoints.push(sub.endpoint);
      }
    }
  }));

  if (deadEndpoints.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
  }

  res.status(200).json({
    sent: sentCount,
    total: (subs || []).length,
    removed: deadEndpoints.length
  });
};

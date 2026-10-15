// Minimal service worker — required for PWA installability.
// Keeps the app shell cached for fast repeat loads; product data always
// comes fresh from Supabase (never cached), since stock/prices change.

const CACHE_NAME = "hlc-shell-v1";
const SHELL_FILES = [
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
  "./og-image.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache Supabase API calls — always go live for product data.
  if (url.hostname.endsWith("supabase.co")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => caches.match("./index.html"))
      );
    })
  );
});

/* ---- push notifications (admin-sent announcements) ---- */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: "Healthy Life Center", message: event.data ? event.data.text() : "" }; }

  const title = data.title || "Healthy Life Center";
  const options = {
    body: data.message || "",
    icon: "icon-192.png",
    badge: "icon-192.png",
    data: { url: data.url || "./" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

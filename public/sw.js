importScripts("portal/uv.bundle.js");
importScripts("portal/uv.config.js");
importScripts("portal/uv.sw.js");

const uv = new UVServiceWorker();

function shouldBypassServiceWorker(request) {
  const url = new URL(request.url);

  if (url.hostname === "github.dev" && url.pathname.startsWith("/pf-signin")) {
    return true;
  }

  const isCodespacesHost = url.hostname.endsWith(".app.github.dev");
  if (!isCodespacesHost) return false;

  return (
    url.pathname.startsWith("/shared_dict/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/pf-signin")
  );
}

async function handleRequest(event) {
  if (uv.route(event)) return uv.fetch(event);
  return fetch(event.request);
}

self.addEventListener("fetch", event => {
  if (shouldBypassServiceWorker(event.request)) {
    return;
  }

  event.respondWith(handleRequest(event));
});

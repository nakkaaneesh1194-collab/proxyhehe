self.skipWaiting();

if (navigator.userAgent.includes("Firefox")) {
  Object.defineProperty(globalThis, "crossOriginIsolated", {
    value: true,
    writable: false
  });
}

importScripts("eggs/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

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
  try {
    await scramjet.loadConfig();
    if (scramjet.route(event)) return await scramjet.fetch(event);
    return await fetch(event.request);
  } catch {
    try {
      return await fetch(event.request);
    } catch {
      return new Response("", { status: 204 });
    }
  }
  await scramjet.loadConfig();
  if (scramjet.route(event)) return scramjet.fetch(event);
  return fetch(event.request);
}

let playgroundData;

self.addEventListener("fetch", event => {
  if (shouldBypassServiceWorker(event.request)) {
    return;
  }

  event.respondWith(handleRequest(event));
});

self.addEventListener("message", ({ data }) => {
  if (data.type === "playgroundData") {
    playgroundData = data;
  }
});

scramjet.addEventListener("request", event => {
  if (!playgroundData || !event.url.href.startsWith(playgroundData.origin)) return;

  const headers = {};
  const base = playgroundData.origin;

  if (event.url.href === `${base}/`) {
    headers["content-type"] = "text/html";
    event.response = new Response(playgroundData.html, { headers });
  } else if (event.url.href === `${base}/style.css`) {
    headers["content-type"] = "text/css";
    event.response = new Response(playgroundData.css, { headers });
  } else if (event.url.href === `${base}/script.js`) {
    headers["content-type"] = "application/javascript";
    event.response = new Response(playgroundData.js, { headers });
  } else {
    event.response = new Response("empty response", { headers });
  }

  event.response.rawHeaders = headers;
  event.response.rawResponse = {
    body: event.response.body,
    headers,
    status: event.response.status,
    statusText: event.response.statusText
  };
  event.response.finalURL = event.url.toString();
});


self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

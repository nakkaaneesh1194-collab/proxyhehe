import { createServer } from 'node:http';
import { join } from 'node:path';
import { epoxyPath } from '@mercuryworkshop/epoxy-transport';
import { baremuxPath } from '@mercuryworkshop/bare-mux/node';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import wisp from 'wisp-server-node';
import { MasqrMiddleware } from './masqr.js';
import dotenv from 'dotenv';

dotenv.config();

const port = 2345;
const server = createServer();
server.on('upgrade', wisp.routeRequest);

const app = Fastify({
  serverFactory: (handler) => (server.on('request', handler), server),
});

await app.register(fastifyCookie, { parseOptions: {} });

const routes = [
  { root: join(import.meta.dirname, 'dist'), prefix: '/' },
  { root: epoxyPath, prefix: '/epoxy/' },
  { root: baremuxPath, prefix: '/baremux/' },
];

await Promise.all(
  routes.map((route, i) =>
    app.register(fastifyStatic, {
      ...route,
      decorateReply: i === 0,
    }),
  ),
);

if (process.env.MASQR === 'true') {
  app.addHook('onRequest', async (req, reply) => {
    await MasqrMiddleware(req, reply);
  });
}

app.get('/assets/img/*', async (req, reply) => {
  const path = req.params['*'];
  const url = `https://dogeub-assets.pages.dev/img/${path}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return reply.code(res.status).send();

    const contentType = res.headers.get('content-type');
    if (contentType) reply.type(contentType);

    const buffer = await res.arrayBuffer();
    return reply.send(Buffer.from(buffer));
  } catch {
    return reply.code(500).send();
  }
});

app.get("/js/script.js", async (req, reply) => {
  try {
    const res = await fetch("https://byod.privatedns.org/js/script.js");
    if (!res.ok) return reply.code(res.status).send();

    const type = res.headers.get("content-type") || "application/javascript";
    reply.type(type);

    const buffer = await res.arrayBuffer();
    reply.send(Buffer.from(buffer));
  } catch {
    reply.code(500).send();
  }
});


app.get('/return', async (req, reply) => {
  const query = req.query?.q;
  if (!query) return reply.code(401).send({ error: 'query parameter?' });

  try {
    const res = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}`);
    return await res.json();
  } catch {
    return reply.code(500).send({ error: 'request failed' });
  }
});

app.setNotFoundHandler((req, reply) => {
  if (req.raw.method === 'GET' && req.headers.accept?.includes('text/html')) {
    return reply.sendFile('index.html');
  }
  reply.code(404).send({ error: 'Not Found' });
});

app.listen({ port }).then(() => console.log(`${port}`)).catch((err) => {
  console.error(err);
  process.exit(1);
});

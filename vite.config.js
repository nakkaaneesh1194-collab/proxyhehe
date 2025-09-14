import { defineConfig, normalizePath } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logging, server as wisp } from '@mercuryworkshop/wisp-js/server';
import { createBareServer } from '@tomphttp/bare-server-node';
import { epoxyPath } from '@mercuryworkshop/epoxy-transport';
import { baremuxPath } from '@mercuryworkshop/bare-mux/node';
import { bareModulePath } from '@mercuryworkshop/bare-as-module3';
import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import react from '@vitejs/plugin-react-swc';
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bare = createBareServer('/seal/');
logging.set_level(logging.NONE);

Object.assign(wisp.options, {
  dns_method: 'resolve',
  dns_servers: ['1.1.1.3', '1.0.0.3'],
  dns_result_order: 'ipv4first',
});

const routeRequest = (req, resOrSocket, head) => {
  if (req.url?.startsWith('/wisp/')) return wisp.routeRequest(req, resOrSocket, head);
  if (bare.shouldRoute(req))
    return head ? bare.routeUpgrade(req, resOrSocket, head) : bare.routeRequest(req, resOrSocket);
};

const obf = {
  enable: true,
  autoExcludeNodeModules: true,
  threadPool: true,
  options: {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    selfDefending: true,
    simplify: true,
    splitStrings: false,
    stringArray: true,
    stringArrayEncoding: [],
    stringArrayCallsTransform: false,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
    ignoreImports: true,
  },
};

export default defineConfig({
  plugins: [
    react(),
    vitePluginBundleObfuscator(obf),
    viteStaticCopy({
      targets: [
        { src: [normalizePath(resolve(epoxyPath, '*'))], dest: 'epoxy' },
        { src: [normalizePath(resolve(baremuxPath, '*'))], dest: 'baremux' },
        { src: [normalizePath(resolve(bareModulePath, '*'))], dest: 'baremod' },
        {
          src: [
            normalizePath(resolve(uvPath, 'uv.handler.js')),
            normalizePath(resolve(uvPath, 'uv.client.js')),
            normalizePath(resolve(uvPath, 'uv.bundle.js')),
            normalizePath(resolve(uvPath, 'uv.sw.js')),
            normalizePath(resolve(uvPath, 'sw.js')),
          ],
          dest: 'uv',
        },
      ],
    }),
    {
      name: 'server',
      configureServer(server) {
        server.httpServer?.on('upgrade', (req, sock, head) => routeRequest(req, sock, head));
        server.middlewares.use((req, res, next) => routeRequest(req, res) || next());
      },
    },
  ],
  build: {
    esbuild: { legalComments: 'none' },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        loader: resolve(__dirname, 'src/static/loader.html'),
      },
      output: {
        entryFileNames: '[hash].js',
        chunkFileNames: (chunk) =>
          chunk.name === 'vendor-modules' ? 'chunks/vendor-modules.js' : 'chunks/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
        manualChunks: (id) => (id.includes('node_modules') ? 'vendor-modules' : undefined),
      },
    },
  },
  css: {
    modules: {
      generateScopedName: () =>
        String.fromCharCode(97 + Math.floor(Math.random() * 17)) +
        Math.random().toString(36).substring(2, 8),
    },
  },
  server: {
    proxy: {
      '/assets/img': {
        target: 'https://dogeub-assets.pages.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/assets\/img/, '/img'),
      },
    },
  },
});

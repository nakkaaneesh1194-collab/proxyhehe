export const CONFIG = {
  bUrl: '/seal/',
  ws: `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/wisp/`,
  transport: '/epoxy/index.mjs',
  unsupported: ['spotify.com'],
  filter: ['neal.fun'],
};

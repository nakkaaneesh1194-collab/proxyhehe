export const CONFIG = {
  bUrl: '/seal/',
  ws: `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/wisp/`,
  transport: '/libcurl/index.mjs',
  unsupported: ['spotify.com'],
  filter: [
    { url: 'neal.fun', type: 'scr' },
    { url: 'geforcenow.com', type: 'scr' },
  ],
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function makeKey(host) {
  const base = host || 'default';
  return encoder.encode((base + base).slice(0, 16));
}

self.__uv$config = {
  prefix: '/uv/service/',
  encodeUrl: (str) => {
    if (!str) return str;
    try {
      const key = makeKey(location.host);
      const data = encoder.encode(str);
      const len = data.length;
      let out = '';
      for (let i = 0; i < len; i++) {
        const v = data[i] ^ key[i % key.length];
        out += v.toString(16).padStart(2, '0');
      }
      return out;
    } catch {
      return str;
    }
  },
  decodeUrl: (str) => {
    if (!str) return str;
    try {
      const len = str.length;
      if (len % 2 !== 0) return decodeURIComponent(str);

      // quick hex check without regex
      for (let i = 0; i < len; i++) {
        const c = str.charCodeAt(i);
        if (
          !(c >= 48 && c <= 57) && // 0-9
          !(c >= 97 && c <= 102) && // a-f
          !(c >= 65 && c <= 70)
        ) {
          // A-F
          return decodeURIComponent(str);
        }
      }

      const key = makeKey(location.host);
      const out = new Uint8Array(len / 2);
      for (let i = 0, j = 0; i < len; i += 2, j++) {
        const byte = parseInt(str.substr(i, 2), 16);
        out[j] = byte ^ key[j % key.length];
      }
      return decoder.decode(out);
    } catch {
      return decodeURIComponent(str);
    }
  },
  handler: '/uv/uv.handler.js',
  client: '/uv/uv.client.js',
  bundle: '/uv/uv.bundle.js',
  config: '/uv/uv.config.js',
  sw: '/uv/uv.sw.js',
};

self.__uv$config = {
  prefix: '/uv/service/',

  encodeUrl: (url) => {
    const dd = Ultraviolet.codec.xor.encode(url);
    return dd.split('').map(c => c + '1').join('');
  },

  decodeUrl: (str) => {
    let c = '';
    for (let i = 0; i < str.length; i += 2) {
      c += str[i];
    }
    return Ultraviolet.codec.xor.decode(c);
  },

  handler: '/uv/uv.handler.js',
  client: '/uv/uv.client.js',
  bundle: '/uv/uv.bundle.js',
  config: '/uv/uv.config.js',
  sw: '/uv/uv.sw.js',
};

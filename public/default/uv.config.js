self.__uv$config = {
    prefix: '/serve/',
    encodeUrl: Ultraviolet.codec.plain.encode,
    decodeUrl: Ultraviolet.codec.plain.decode,
    handler: './uv.handler.js',
    client: './uv.client.js',
    bundle: './uv.bundle.js',
    config: './uv.config.js',
    sw: './uv.sw.js',
};

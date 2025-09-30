window.addEventListener('load', async () => {
  window.scr = null;
  const { ScramjetController } = $scramjetLoadController();
  const connection = new BareMuxConnection('/baremux/worker.js');
  const { log, warn, error } = logUtils;

  const getOption = (key, fallback) => {
    const item = JSON.parse(localStorage.getItem('options') || '{}')[key];
    return item !== '' && item ? item : fallback;
  };

  const ws = getOption('wServer', CONFIG.ws);
  const transport = CONFIG.transport;
  let c = self.__uv$config;

  const setTransport = async () => {
    try {
      await connection.setTransport(transport, [{ wisp: ws }]);
      log(`Set transport: ${transport}`);
    } catch (e) {
      error('setTransport failed:', e);
      throw e;
    }
  };

  await setTransport();

  window.scr = new ScramjetController({
    files: {
      wasm: '/scram/scramjet.wasm.wasm',
      all: '/scram/scramjet.all.js',
      sync: '/scram/scramjet.sync.js',
    },
    flags: { rewriterLogs: false, scramitize: false, cleanErrors: true, sourcemaps: true },
  });

  try {
    await scr.init();
    log('scr.init() complete');
  } catch (err) {
    error('scr.init() failed:', err);
    throw err;
  }

  const sws = [
    { path: '/s_sw.js', scope: '/scramjet/' },
    { path: '/uv/sw.js' },
  ];
  for (const sw of sws) {
    try {
      await navigator.serviceWorker.register(sw.path, sw.scope ? { scope: sw.scope } : undefined);
    } catch (err) {
      warn(`SW reg err (${sw.path}):`, err);
    }
  }

  let tabManager;
  try {
    tabManager = new TabManager([c.encodeUrl, c.decodeUrl]);
  } catch (err) {
    error('TabManager init failed:', err);
    throw err;
  }

  const query = sessionStorage.getItem('query');
  if (query) {
    tabManager.navigate(query);
    sessionStorage.removeItem('query');
  }

  setInterval(setTransport, 30000);

  const domMap = {
    'tabs-btn': () => document.getElementById('tb')?.classList.toggle('hidden'),
    'tbtog': () => {
      document.getElementById('tb')?.classList.add('hidden');
      if (!localStorage.getItem('tip0')) {
        document.dispatchEvent(new CustomEvent('basecoat:toast', {
          detail: { config: { category: 'info', title: 'Tips Notifier', duration: Math.pow(6400, 2), description: 'You can hide the tab bar automatically in Settings!', cancel: { label: 'Got it!' } } }
        }));
        localStorage.setItem('tip0', '1');
      }
    },
    'n-bk': () => tabManager.back(),
    'n-fw': () => tabManager.forward(),
    'n-rl': () => tabManager.reload(),
  };

  (tabManager.options.showTb ?? true) && domMap['tabs-btn']();
  Object.entries(domMap).forEach(([id, fn]) => document.getElementById(id)?.addEventListener('click', fn));
});

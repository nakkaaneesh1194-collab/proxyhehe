import { BareMuxConnection } from '@mercuryworkshop/bare-mux';
import * as contentObserver from './content_observer';
import { setupHotkeys } from './hotkeys';
import { CONFIG } from './config';
import { logUtils } from '/src/utils/utils';

const createIframe = (url, manager, tab, srcPrefix = '') => {
  const f = document.createElement('iframe');
  f.id = `iframe-${tab.id}`;
  f.className = manager.fCss;
  f.style.zIndex = 10;
  f.style.opacity = '1';
  f.style.pointerEvents = 'auto';
  f.src = srcPrefix + url;
  manager.ic.appendChild(f);
  return f;
};

export const PR_TYPE = {
  scr: {
    create: (url, manager, tab) => {
      const sf = scr.createFrame();
      manager.frames[tab.id] = sf;
      const frame = sf.frame;
      frame.id = `iframe-${tab.id}`;
      frame.className = manager.fCss;
      frame.style.zIndex = 10;
      frame.style.opacity = '1';
      frame.style.pointerEvents = 'auto';
      manager.ic.appendChild(frame);
      sf.go(url);
      manager.addLoadListener(tab.id);
    },
    navigate: (url, manager, tab, iframe) => {
      if (manager.frames[tab.id]) manager.frames[tab.id].go(url);
      else if (iframe) {
        const sf = scr.createFrame(iframe);
        manager.frames[tab.id] = sf;
        sf.go(url);
      }
    },
  },

  uv: {
    create: (url, manager, tab) => createIframe(manager.enc(url), manager, tab, '/uv/service/'),
    navigate: (url, manager, tab, iframe) => iframe && (iframe.src = '/uv/service/' + manager.enc(url)),
  },

  uv1: {
    create: (url, manager, tab) => createIframe(manager.enc(url), manager, tab, '/assignments/'),
    navigate: (url, manager, tab, iframe) => iframe && (iframe.src = '/assignments/' + manager.enc(url)),
  },

  auto: {
    create: (url, manager, tab) => {
      const matched = manager.filter?.find(f => url.toLowerCase().includes(f.url.toLowerCase()));
      return PR_TYPE[matched?.type || (manager.filter?.some(f => f.type === 'scr' && url.toLowerCase().includes(f.url.toLowerCase())) ? 'scr' : 'uv')].create(url, manager, tab);
    },
    navigate: (url, manager, tab, iframe) => {
      const matched = manager.filter?.find(f => url.toLowerCase().includes(f.url.toLowerCase()));
      return PR_TYPE[matched?.type || (manager.filter?.some(f => f.type === 'scr' && url.toLowerCase().includes(f.url.toLowerCase())) ? 'scr' : 'uv')].navigate(url, manager, tab, iframe);
    },
  },
};

class TabManager {
  constructor(arr) {
    this.unsupported = CONFIG.unsupported;
    this.filter = CONFIG.filter;
    this.options = JSON.parse(localStorage.getItem('options')) || {};
    this.prType = this.options.prType || 'auto';
    this.search = this.options.engine || 'https://www.google.com/search?q=';
    this.newTabUrl = '/new';
    this.newTabTitle = 'New Tab';
    this.enc = arr[0];
    this.dnc = arr[1];
    this.frames = {};
    this.tabs = [{ id: 1, title: this.newTabTitle, url: this.newTabUrl, active: true }];
    this.nextId = 2;
    this.maxTabs = 10;
    this.minW = 50;
    this.maxW = 200;

    this.urlTrack = new Map();
    this.urlInterval = 1000;

    this.tc = document.getElementById('tabs-cont');
    this.ab = document.getElementById('tab-btn');
    this.ic = document.getElementById('fcn');
    this.ui = document.getElementById('url');
    this.bg = document.getElementById('class-portal');
    this.fCss =
      'w-full h-full border-0 absolute top-0 left-0 z-0 transition-opacity duration-200 ease-in-out opacity-0 pointer-events-none';

    this.ab.onclick = () => this.add();

    this.tc.onclick = (e) => {
      const el = e.target.closest('.close-tab, .tab-item');
      if (!el) return;
      const id = +el.dataset.tabId;
      el.classList.contains('close-tab') ? this.close(id) : this.activate(id);
    };

    if (this.ui) {
      this.ui.value = this.isNewTab(this.tabs[0].url) ? '' : this.tabs[0].url;
      this.ui.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = this.ui.value.trim();
          this.updateUrl(val);
          if (val !== 'tabs://new') this.ui.value = this.formatInputUrl(val);
          this.ui.blur();
        }
      });
    }

    window.addEventListener('resize', () => {
      this.updateAddBtn();
      this.updateWidths();
    });

    this.render();
    this.createIframes();
    this.updateAddBtn();
    this.startTracking();
    contentObserver.init();
    setupHotkeys();

    window.tabManager = this;
  }

  ex = (url) => {
    const endpoints = Object.values(PR_TYPE)
      .map((p) => 
        p === PR_TYPE.scr ? 'scramjet' : 
        p === PR_TYPE.uv ? 'uv/service' : 
        p === PR_TYPE.uv1 ? 'assignments' : 
        null
      )
      .filter(Boolean)
      .join('|');

    const regex = new RegExp(`^https?:\/\/[^\/]+\/(${endpoints})\/`, 'i');
    return this.dnc(url.replace(regex, ''));
  };

  showBg = (c) => {
    this.bg.style.opacity = c ? '1' : '0';
    this.bg.style.pointerEvents = c ? 'auto' : 'none';
  };

  escapeHTML = (str) => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  formatInputUrl = (input, search = this.search) =>
    /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/i.test(input)
      ? /^https?:\/\//.test(input)
        ? input
        : 'https://' + input
      : search + encodeURIComponent(input);

  domain = (url) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return this.newTabTitle;
    }
  };

  isNewTab = (url) => url === this.newTabUrl;

  active = () => this.tabs.find((t) => t.active);

  setFrameState = (tabId, active) => {
    const f = document.getElementById(`iframe-${tabId}`);
    if (!f) return;
    f.style.zIndex = active ? 10 : 0;
    f.style.opacity = active ? '1' : '0';
    f.style.pointerEvents = active ? 'auto' : 'none';
    f.classList.toggle('f-active', active);
  };

  showActive = () => {
    const activeTab = this.active();
    this.tabs.forEach(t => this.setFrameState(t.id, t === activeTab));
  };

  startTracking = () => this.tabs.forEach((t) => this.track(t.id));

  track = (id) => {
    if (this.urlTrack.has(id)) clearInterval(this.urlTrack.get(id));
    const iv = setInterval(() => this.checkStudentUrl(id), this.urlInterval);
    this.urlTrack.set(id, iv);
  };

  stopTrack = (id) => {
    if (this.urlTrack.has(id)) {
      clearInterval(this.urlTrack.get(id));
      this.urlTrack.delete(id);
    }
  };

  createIframes = () => {
    this.tabs.forEach((t) => {
      if (!document.getElementById(`iframe-${t.id}`)) {
        const f = document.createElement('iframe');
        f.id = `iframe-${t.id}`;
        f.className = this.fCss;
        f.style.zIndex = 0;
        if (this.isNewTab(t.url)) {
          f.src = t.url;
          f.onload = () => {
            try { contentObserver.unbind(); contentObserver.bind(); } catch {}
          };
        }
        this.ic.appendChild(f);
      }
    });
    this.showActive();
  };

  back = () => {
    const activeTab = this.active();
    if (!activeTab) return;

    const iframe = document.getElementById(`iframe-${activeTab.id}`);
    if (!iframe || this.isNewTab(activeTab.url)) return;

    try {
      const historyLength = iframe.contentWindow.history.length;
      if (historyLength > 1) iframe.contentWindow.history.back();
      else console.info('[info] back(): no history to go back');
    } catch (err) {
      console.warn('[err] back():', err);
    }
  };

  forward = () => {
    const activeTab = this.active();
    if (!activeTab) return;

    const iframe = document.getElementById(`iframe-${activeTab.id}`);
    if (!iframe || this.isNewTab(activeTab.url)) return;

    try {
      if (iframe.contentWindow.history.length > 1) iframe.contentWindow.history.forward();
      else console.info('[info] forward(): no history to go forward');
    } catch (err) {
      console.warn('[err] forward():', err);
    }
  };

  reload = () => {
    const activeTab = this.active();
    if (!activeTab) return;
    const iframe = document.getElementById(`iframe-${activeTab.id}`);
    if (!iframe) return;
    try {
      iframe.contentWindow.location.reload();
    } catch (err) {
      console.warn('[err] reload():', err);
    }
  };

  navigate = (input) => {
    if (!input) return;
    this.updateUrl(input);
  };

  addLoadListener = (id) => {
    const f = document.getElementById(`iframe-${id}`);
    if (!f || f.hasListener) return;
    f.hasListener = true;
    f.addEventListener('load', () => {
      const t = this.tabs.find((t) => t.id === id);
      if (!t) return;
      try {
        const newUrl = f.contentWindow.location.href;
        if (newUrl && newUrl !== t.url && newUrl !== 'about:blank') this.updateTabMeta(t, f, newUrl);
      } catch {}
    });
  };

  checkStudentUrl = (id) => {
    const t = this.tabs.find((t) => t.id === id);
    const f = document.getElementById(`iframe-${id}`);
    if (!t || !f || this.isNewTab(t.url)) return;
    try {
      const newUrl = f.contentWindow.location.href;
      if (newUrl && newUrl !== t.url && newUrl !== 'about:blank') {
        this.updateTabMeta(t, f, newUrl);
        try { contentObserver.unbind(); contentObserver.bind(); } catch {}
      }
    } catch { this.addLoadListener(id); }
  };

  updateTabMeta = (t, f, newUrl) => {
    t.url = newUrl;
    const trySetTitle = (tries = 10) => {
      const doc = f.contentDocument;
      const ttl = doc?.title?.trim();
      if (ttl) t.title = ttl.length > 20 ? ttl.slice(0, 20) + '...' : ttl;
      else if (tries > 0) setTimeout(() => trySetTitle(tries - 1), 100);
      else t.title = this.domain(newUrl);
      this.render();
    };
    trySetTitle();
    if (t.active && this.ui && !this.isNewTab(t.url)) {
      this.ui.value = this.ex(newUrl);
      this.showBg(false);
    }
  };

  add = () => {
    if (this.tabs.length >= this.maxTabs) return;
    this.tabs.forEach(t => t.active = false);
    const t = { id: this.nextId++, title: this.newTabTitle, url: this.newTabUrl, active: true };
    this.tabs.push(t);
    this.render();
    this.createIframes();
    this.updateAddBtn();
    this.track(t.id);
    if (this.ui) this.ui.value = '';
  };

  close = (id) => {
    if (this.tabs.length === 1) return;
    const i = this.tabs.findIndex(t => t.id === id);
    if (i === -1) return;
    const wasActive = this.tabs[i].active;
    this.tabs.splice(i, 1);
    this.stopTrack(id);
    document.getElementById(`iframe-${id}`)?.remove();
    if (wasActive) {
      const newIdx = Math.min(i, this.tabs.length - 1);
      this.tabs.forEach(t => t.active = false);
      this.tabs[newIdx].active = true;
      this.showActive();
      if (this.ui) this.ui.value = this.isNewTab(this.tabs[newIdx].url) ? '' : this.ex(this.tabs[newIdx].url);
    }
    this.render();
    this.updateAddBtn();
    this.updateWidths();
  };

  activate = (id) => {
    if (this.active()?.id === id) return;
    this.tabs.forEach(t => t.active = t.id === id);
    this.render();
    this.showActive();
    if (this.ui) {
      const activeTab = this.active();
      this.ui.value = activeTab && !this.isNewTab(activeTab.url) ? this.ex(activeTab.url) : '';
    }
  };

  updateUrl = async (input) => {
    if (!input) return;
    const t = this.active();
    if (!t) return;
    if (this.unsupported.some(s => input.includes(s))) {
      alert(`The website "${input}" is not supported at this time`);
      return;
    }

    if (input === 'tabs://new') {
      document.getElementById(`iframe-${t.id}`)?.remove();
      const f = document.createElement('iframe');
      f.id = `iframe-${t.id}`;
      f.className = this.fCss;
      f.style.zIndex = 10;
      f.style.opacity = '1';
      f.style.pointerEvents = 'auto';
      f.src = this.newTabUrl;
      this.ic.appendChild(f);
      t.url = this.newTabUrl;
      t.title = this.newTabTitle;
      if (this.ui) this.ui.value = '';
      f.onload = () => { try { contentObserver.unbind(); contentObserver.bind(); } catch {} };
      this.showActive();
      this.render();
      return;
    }

    const url = this.formatInputUrl(input);
    this.showBg(false);
    const proxyType = PR_TYPE[this.prType] || PR_TYPE.auto;
    const f = document.getElementById(`iframe-${t.id}`);
    if (this.isNewTab(t.url)) {
      document.getElementById(`iframe-${t.id}`)?.remove();
      proxyType.create(url, this, t);
    } else proxyType.navigate(url, this, t, f);

    t.url = url;
    try { t.title = new URL(url).hostname.replace('www.', ''); } catch { t.title = input; }
    this.showActive();
    this.render();
  };

  getTabWidth = () => {
    const w = this.tc.offsetWidth || 800;
    return Math.min(this.maxW, Math.max(this.minW, w / this.tabs.length));
  };

  updateWidths = () => {
    const w = this.getTabWidth();
    this.tc.querySelectorAll('.tab-item').forEach(el => {
      el.style.width = w + 'px';
      el.style.minWidth = this.minW + 'px';
    });
  };

  updateAddBtn = () => {
    const dis = this.tabs.length >= this.maxTabs || this.getTabWidth() <= this.minW;
    this.ab.disabled = dis;
    this.ab.classList.toggle('opacity-50', dis);
    this.ab.classList.toggle('cursor-not-allowed', dis);
    this.ab.classList.toggle('hover:bg-[#b6bfc748]', !dis);
    this.ab.classList.toggle('active:bg-[#d8e4ee6e]', !dis);
    this.ab.title = dis ? `Maximum ${this.maxTabs} tabs allowed` : 'Add new tab';
  };

  render = () => {
    const w = this.getTabWidth();
    const op = JSON.parse(localStorage.getItem('options') || '{}');
    this.tc.innerHTML = this.tabs
      .map((t, i) => `
        <div class="tab-item relative flex items-center rounded-b-none justify-between pl-2.5 pr-1.5 py-[0.28rem] rounded-[6px] cursor-pointer transition-all duration-200 ease-in-out ${
          t.active ? `border border-b-0 text-[${op.bodyText || '#8a9bb8'}]` : 'hover:bg-[#cccccc2f]'
        } ${i === 0 ? 'ml-0' : '-ml-px'}" style="width:${w}px;min-width:${this.minW}px;background-color:${t.active ? op.urlBarBg || '#1d303f' : undefined}" data-tab-id="${t.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe-icon lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          <span class="text-[12px] font-medium truncate flex-1 mr-2 ml-1.5" title="${this.escapeHTML(t.title)}">${this.escapeHTML(t.title)}</span>
          ${this.tabs.length > 1 ? `<button class="close-tab shrink-0 w-4 h-4 rounded-full hover:bg-[#b6bfc748] active:bg-[#d0dbe467] flex items-center justify-center transition-colors" data-tab-id="${t.id}" title="Close ${this.escapeHTML(t.title)}"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>` : ''}
        </div>`).join('');
  };
}

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
  const transport = (location.hostname.endsWith('.vercel.app') ? CONFIG.baremod : CONFIG.transport);
  let c = self.__uv$config;

  const setTransport = async () => {
    try { await connection.setTransport(transport, [{ wisp: ws }]); log(`Set transport: ${transport}`); }
    catch (e) { error('setTransport failed:', e); throw e; }
  };

  await setTransport();
  setInterval(setTransport, 30000);

  window.scr = new ScramjetController({
    files: {
      wasm: '/scram/scramjet.wasm.wasm',
      all: '/scram/scramjet.all.js',
      sync: '/scram/scramjet.sync.js',
    },
    flags: { rewriterLogs: false, scramitize: false, cleanErrors: true, sourcemaps: true },
  });

  try { await scr.init(); log('scr.init()'); } catch (err) { error('scr.init() failed:', err); throw err; }

  const sws = [
    { path: '/s_sw.js', scope: '/scramjet/' },
    // { path: '/lab.js', scope: '/assignments/' },
    { path: '/uv/sw.js' },
  ];

  for (const sw of sws) {
    try { await navigator.serviceWorker.register(sw.path, sw.scope ? { scope: sw.scope } : undefined); }
    catch (err) { warn(`SW reg err (${sw.path}):`, err); }
  }

  let tabManager;
  try {
    tabManager = await new TabManager([c.encodeUrl, c.decodeUrl]);
  } catch (err) { error('TabManager init failed:', err); throw err; }

  const query = sessionStorage.getItem('query');
  query && tabManager.navigate(query);
  sessionStorage.removeItem('query');

  const domMap = {
    'tabs-btn': () => document.getElementById('tb')?.classList.toggle('hidden'),
    'tbtog': () => {
      document.getElementById('tb')?.classList.add('hidden');
      !localStorage.getItem('tip0') && document.dispatchEvent(new CustomEvent('basecoat:toast', {
        detail: { config: { category: 'info', title: 'Tips Notifier', duration: Math.pow(6400, 2), description: 'You can hide the tab bar automatically in Settings!', cancel: { label: 'Got it!' } } }
      }));
      localStorage.setItem('tip0', '1');
    },
    'n-bk': () => tabManager.back(),
    'n-fw': () => tabManager.forward(),
    'n-rl': () => tabManager.reload(),
  };

  (tabManager.options.showTb ?? true) && domMap['tabs-btn']();
  Object.entries(domMap).forEach(([id, fn]) => document.getElementById(id)?.addEventListener('click', fn));
});

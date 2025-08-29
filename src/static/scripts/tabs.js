import { BareMuxConnection } from '@mercuryworkshop/bare-mux';
import * as contentObserver from './content_observer';
import { setupHotkeys } from './hotkeys';
import { unsupported, filter } from './config';

class TabManager {
  constructor() {
    this.unsupported = unsupported;
    this.filter = filter;
    this.options = JSON.parse(localStorage.getItem('options')) || {};
    this.prType = this.options.prType || 'scr';
    this.search = this.options.engine || 'https://www.google.com/search?q=';
    this.newTabUrl = '/new';
    this.newTabTitle = 'New Tab';
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

          if (val !== 'tabs://new') {
            this.ui.value = this.formatInputUrl(val);
          }

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

  ex = (url) => decodeURIComponent(url.replace(/^https?:\/\/[^\/]+\/(scramjet|serve)\//i, ''));

  shouldUseScramjet = async (input) => {
    if (this.prType === 'scr') return true;
    if (this.prType === 'uv') return false;
    if (this.prType === 'auto') {
      try {
        return this.filter.some((f) => input.toLowerCase().includes(f.toLowerCase()));
      } catch {
        return false;
      }
    }
    return false;
  };

  showBg = (c) => {
    this.bg.style.opacity = c ? '1' : '0';
    this.bg.style.pointerEvents = c ? 'auto' : 'none';
  };

  nameActive = () => {
    const b = document.querySelector('iframe.f-active');
    if (b) b.classList.remove('f-active');
  };

  formatInputUrl = (input, search = this.search) =>
    /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/i.test(input)
      ? /^https?:\/\//.test(input)
        ? input
        : 'https://' + input
      : search + encodeURIComponent(input);

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

  navigate = (input) => {
    if (!input) return;
    this.updateUrl(input);
  };

  checkStudentUrl = (id) => {
    const t = this.tabs.find((t) => t.id === id);
    const f = document.getElementById(`iframe-${id}`);
    if (!t || !f || this.isNewTab(t.url)) return;

    try {
      const newUrl = f.contentWindow.location.href;
      if (newUrl && newUrl !== t.url && newUrl !== 'about:blank') {
        this.updateTabMeta(t, f, newUrl);
        try {
          contentObserver.unbind();
          contentObserver.bind();
        } catch {}
      }
    } catch {
      this.addLoadListener(id);
    }
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
        if (newUrl && newUrl !== t.url && newUrl !== 'about:blank') {
          this.updateTabMeta(t, f, newUrl);
        }
      } catch {}
    });
  };

  updateTabMeta = (t, f, newUrl) => {
    t.url = newUrl;
    const trySetTitle = (tries = 10) => {
      const doc = f.contentDocument;
      const ttl = doc?.title?.trim();
      if (ttl) {
        t.title = ttl.length > 20 ? ttl.slice(0, 20) + '...' : ttl;
        this.render();
      } else if (tries > 0) {
        setTimeout(() => trySetTitle(tries - 1), 100);
      } else {
        t.title = this.domain(newUrl);
        this.render();
      }
    };
    trySetTitle();
    if (t.active && this.ui && !this.isNewTab(t.url)) {
      this.ui.value = this.ex(newUrl);
      this.showBg(false);
    }
  };

  domain = (url) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return this.newTabTitle;
    }
  };

  isNewTab = (url) => url === this.newTabUrl;

  add = () => {
    if (this.tabs.length >= this.maxTabs) return;
    this.tabs.forEach((t) => (t.active = false));
    const t = {
      id: this.nextId++,
      title: this.newTabTitle,
      url: this.newTabUrl,
      active: true,
    };
    this.tabs.push(t);
    this.render();
    this.createIframes();
    this.updateAddBtn();
    this.track(t.id);
    if (this.ui) this.ui.value = this.isNewTab(t.url) ? '' : t.url;
  };

  close = (id) => {
    if (this.tabs.length === 1) return;
    const i = this.tabs.findIndex((t) => t.id === id);
    if (i === -1) return;
    const wasActive = this.tabs[i].active;
    this.tabs.splice(i, 1);
    this.stopTrack(id);
    document.getElementById(`iframe-${id}`)?.remove();
    if (wasActive) {
      const newIdx = Math.min(i, this.tabs.length - 1);
      this.tabs.forEach((t) => (t.active = false));
      this.tabs[newIdx].active = true;
      this.showActive();
      if (this.ui) {
        const newTab = this.tabs[newIdx];
        this.ui.value = this.isNewTab(newTab.url) ? '' : this.ex(newTab.url);
      }
    }
    this.render();
    this.updateAddBtn();
    this.updateWidths();
  };

  activate = (id) => {
    if (this.active()?.id === id) return;
    this.tabs.forEach((t) => (t.active = t.id === id));
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

    if (this.unsupported.some((s) => input.includes(s))) {
      alert(`The website "${input}" is not supported at this time`);
      return;
    }

    if (input === 'tabs://new') {
      const oldFrame = document.getElementById(`iframe-${t.id}`);
      if (oldFrame) oldFrame.remove();
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
      f.onload = () => {
        try {
          contentObserver.unbind();
          contentObserver.bind();
        } catch {}
      };
      this.showActive();
      this.render();
      return;
    }

    const url = this.formatInputUrl(input);
    this.showBg(false);

    const useScr = await this.shouldUseScramjet(url);
    const f = document.getElementById(`iframe-${t.id}`);

    if (this.isNewTab(t.url)) {
      const oldFrame = document.getElementById(`iframe-${t.id}`);
      if (oldFrame) oldFrame.remove();

      if (useScr) {
        const sf = scramjet.createFrame();
        this.frames[t.id] = sf;
        const frame = sf.frame;
        frame.id = f.id;
        frame.className = f.className;
        this.ic.appendChild(frame);
        sf.go(url);
        this.addLoadListener(t.id);
      } else {
        const f = document.createElement('iframe');
        f.id = `iframe-${t.id}`;
        f.className = this.fCss;
        f.style.zIndex = 10;
        f.style.opacity = '1';
        f.style.pointerEvents = 'auto';
        f.src = '/serve/' + encodeURIComponent(url);
        this.ic.appendChild(f);
      }

      t.url = url;
    } else {
      if (useScr) {
        if (this.frames[t.id]) {
          this.frames[t.id].go(url);
        } else if (f) {
          const sf = scramjet.createFrame(f);
          this.frames[t.id] = sf;
          sf.go(url);
        }
      } else {
        if (f) f.src = '/serve/' + encodeURIComponent(url);
      }
      t.url = url;
    }

    this.showActive();
    this.render();
    try {
      t.title = new URL(url).hostname.replace('www.', '');
    } catch {
      t.title = input;
    }
  };

  active = () => this.tabs.find((t) => t.active);

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
            try {
              contentObserver.unbind();
              contentObserver.bind();
            } catch {}
          };
        }

        this.ic.appendChild(f);
      }
    });
    this.showActive();
  };

  showActive = () => {
    const a = this.active();
    if (!a) return;

    this.tabs.forEach((t) => {
      const f = document.getElementById(`iframe-${t.id}`);
      if (!f) return;

      if (t.id === a.id) {
        f.style.zIndex = 10;
        f.style.opacity = '1';
        f.style.pointerEvents = 'auto';
        f.classList.add('f-active');
      } else {
        f.style.zIndex = 0;
        f.style.opacity = '0';
        f.style.pointerEvents = 'none';
        f.classList.remove('f-active');
      }
    });
  };

  getTabWidth = () => {
    const w = this.tc.offsetWidth || 800;
    return Math.min(this.maxW, Math.max(this.minW, w / this.tabs.length));
  };

  updateWidths = () => {
    const w = this.getTabWidth();
    this.tc.querySelectorAll('.tab-item').forEach((el) => {
      el.style.width = w + 'px';
      el.style.minWidth = this.minW + 'px';
    });
  };

  updateAddBtn = () => {
    const b = this.ab;
    const dis = this.tabs.length >= this.maxTabs || this.getTabWidth() <= this.minW;
    b.disabled = dis;
    b.classList.toggle('opacity-50', dis);
    b.classList.toggle('cursor-not-allowed', dis);
    b.classList.toggle('hover:bg-[#b6bfc748]', !dis);
    b.classList.toggle('active:bg-[#d8e4ee6e]', !dis);
    b.title = dis ? `Maximum ${this.maxTabs} tabs allowed` : 'Add new tab';
  };

  back = () => {
    const activeTab = this.active();
    if (!activeTab) return;
    const iframe = document.getElementById(`iframe-${activeTab.id}`);
    if (!iframe || this.isNewTab(activeTab.url)) return;
    try {
      iframe.contentWindow.history.back();
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
      iframe.contentWindow.history.forward();
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

  render = () => {
    const w = this.getTabWidth();
    this.tc.innerHTML = this.tabs
      .map(
        (t, i) => `
          <div class="tab-item relative flex items-center justify-between pl-2.5 pr-1.5 py-1 rounded-[6px] cursor-pointer transition-all duration-200 ease-in-out ${
            t.active
              ? 'bg-[#8b8b8b3f] text-[' +
                  JSON.parse(localStorage.getItem('options') || {}).bodyText || '#8a9bb8' + ']'
              : 'hover:bg-[#cccccc2f]'
          } ${i === 0 ? 'ml-0' : '-ml-px'}" style="width:${w}px;min-width:${
          this.minW
        }px" data-tab-id="${t.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe-icon lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            <span class="text-[12px] font-medium truncate flex-1 mr-2 ml-1.5" title="${this.escapeHTML(
              t.title,
            )}">${this.escapeHTML(t.title)}</span>
            ${
              this.tabs.length > 1
                ? `<button class="close-tab shrink-0 w-4 h-4 rounded-full hover:bg-[#b6bfc748] active:bg-[#d0dbe467] flex items-center justify-center transition-colors" data-tab-id="${
                    t.id
                  }" title="Close ${this.escapeHTML(
                    t.title,
                  )}"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>`
                : ''
            }
          </div>`,
      )
      .join('');
  };

  escapeHTML = (str) => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };
}
window.addEventListener('load', async () => {
  window.scramjet = null;

  const { ScramjetController } = $scramjetLoadController();
  const connection = new BareMuxConnection('/baremux/worker.js');
  const ws =
    JSON.parse(localStorage.getItem('options') || {}).wServer ||
    `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/wisp/`;
  try {
    await connection.setTransport('/epoxy/index.mjs', [{ wisp: ws }]);
  } catch (e) {
    console.error('failed to set transport:', e);
    return;
  }

  window.scramjet = new ScramjetController({
    files: {
      wasm: '/scram/scramjet.wasm.wasm',
      all: '/scram/scramjet.all.js',
      sync: '/scram/scramjet.sync.js',
    },
    flags: {
      rewriterLogs: false,
      cleanErrors: true,
    },
  });

  try {
    await scramjet.init();
  } catch (err) {
    console.error('await scramjet.init() failed:', err);
  }

  try {
    await navigator.serviceWorker.register('/sw.js', {
      scope: '/scramjet/',
    });
  } catch (err) {
    console.error('scr sw reg err:', err);
  }

  try {
    await navigator.serviceWorker.register('/v_sw.js');
  } catch (err) {
    console.error('uv sw reg err:', err);
  }

  try {
    await new TabManager();
  } catch (err) {
    console.error(err);
  }

  const query = sessionStorage.getItem('query');
  if (query) {
    tabManager.navigate(query);
    sessionStorage.removeItem('query');
  }

  const tbtn = document.getElementById('tabs-btn');
  const tbar = document.getElementById('tb');
  const bBtn = document.getElementById('n-bk');
  const fBtn = document.getElementById('n-fw');
  const rBtn = document.getElementById('n-rl');

  if (tbtn && tbar) tbtn.addEventListener('click', () => tbar.classList.toggle('hidden'));
  bBtn.addEventListener('click', () => tabManager.back());
  fBtn.addEventListener('click', () => tabManager.forward());
  rBtn.addEventListener('click', () => tabManager.reload());
});

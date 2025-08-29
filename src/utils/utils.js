let blur, focus, panicListener;

export const ckOff = () => {
  const op = JSON.parse(localStorage.options || '{}');
  import('./config.js').then(({ meta }) => {
    const { tabName: t, tabIcon: i } = op;
    const { tabName: ogName, tabIcon: ogIcon } = meta[0].value;
    const set = (title, icon) => {
      document.title = title;
      document.querySelector("link[rel~='icon']").href = icon;
    };
    blur && window.removeEventListener('blur', blur);
    focus && window.removeEventListener('focus', focus);
    if (op.clkOff) {
      set(t, i);
      blur = () => {
        // use new op for latest value
        const op = JSON.parse(localStorage.options || '{}');
        set(op.tabName || ogName, op.tabIcon || ogIcon);
      };
      focus = () => set(ogName, ogIcon);
      window.addEventListener('blur', blur);
      window.addEventListener('focus', focus);
      set(ogName, ogIcon);
    } else {
      set(t || ogName, i || ogIcon);
      blur = focus = null;
    }
  });
};

export const panic = () => {
  const op = JSON.parse(localStorage.options || '{}');
  const panicConfig = op.panic;
  if (panicListener) {
    window.removeEventListener('keydown', panicListener);
    panicListener = null;
  }
  if (panicConfig?.key && panicConfig?.url && !!op.panicToggleEnabled) {
    panicListener = (e) => {
      const combo = [];
      if (e.ctrlKey) combo.push('Ctrl');
      if (e.altKey) combo.push('Alt');
      if (e.shiftKey) combo.push('Shift');
      if (e.metaKey) combo.push('Meta');
      combo.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);

      const pressed = combo.join('+');
      if (pressed === panicConfig.key) {
        e.preventDefault();
        window.location.href = panicConfig.url;
      }
    };

    window.addEventListener('keydown', panicListener);
  }
};

export const check = (() => {
  const op = JSON.parse(localStorage.options || '{}');
  if (op.beforeUnload) {
    window.addEventListener('beforeunload', (e) => {
      e.preventDefault();
      e.returnValue = '';
    });
  }
  if (window.top === window.self && op.aboutBlank) {
    const w = open('about:blank');
    if (!w || w.closed) {
      alert('Please enable popups to continue.');
      location.href = 'https://google.com';
    } else {
      const d = w.document,
        f = d.createElement('iframe');
      Object.assign(f, { src: location.href });
      Object.assign(f.style, { width: '100%', height: '100%', border: 'none' });
      Object.assign(d.body.style, { margin: 0, height: '100vh' });
      d.documentElement.style.height = '100%';
      d.body.append(f);
      location.href = 'https://google.com';
    }
    history.replaceState(null, '', '/');
  }

  ckOff();
  panic();
})();

export const reg = async () => {
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.log(err);
  }
};

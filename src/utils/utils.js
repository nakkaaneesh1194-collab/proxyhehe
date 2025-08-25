export const check = (() => {
  if (JSON.parse(localStorage.options || '{}').beforeUnload) {
    window.addEventListener('beforeunload', (e) => {
      e.preventDefault();
      e.returnValue = '';
    });
  }
  if (window.top === window.self && JSON.parse(localStorage.options || '{}').aboutBlank) {
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
})();

export const reg = async () => {
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.log(err);
  }
};

export const meta = {
  icon: '/icon.svg',
  name: 'v5-indev-5.0.0 dev'
}
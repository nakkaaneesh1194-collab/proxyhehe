const preloaders = new Map();

export function registerPreloader(path, fn) {
  if (typeof fn === 'function') preloaders.set(path, fn);
}

export function preloadPath(path) {
  const fn = preloaders.get(path);
  try {
    if (fn) {
      const p = fn();
      if (p && typeof p.then === 'function') {
        p.catch(() => {});
      }
    }
  } catch {
    // gulp
  }
}

if (typeof window !== 'undefined') {
  window.__routePreload = { preloadPath, registerPreloader };
}

export default preloadPath;

import Routing from './Routing';
import { OptionsProvider, useOptions } from './utils/optionsContext';
import { meta } from './utils/config';
import './index.css';
import 'nprogress/nprogress.css';
import Loader from './pages/Loader';
import New from './pages/New';
import lazyLoad from './lazyWrapper';
import NotFound from './pages/NotFound';
import { useEffect, useRef } from 'react';

const Home = lazyLoad(() => import('./pages/Home'));
const Apps = lazyLoad(() => import('./pages/Apps'));
const Games = lazyLoad(() => import('./pages/Games'));
const Settings = lazyLoad(() => import('./pages/Settings'));

const ThemedApp = () => {
  const { options } = useOptions();
  const originalTitleRef = useRef(null);
  const originalIconRef = useRef(null);

  const defaultTitle = meta[0].value.tabName;
  const defaultIcon = meta[0].value.tabIcon;
  const cloakTitle = options.tabName || defaultTitle;
  const cloakIcon = options.tabIcon || defaultIcon;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!options.autoCloak) return;

      const iconElement = document.querySelector("link[rel~='icon']");
      
      if (document.hidden) {
        document.title = cloakTitle;
        iconElement.href = cloakIcon;
      } else {
        document.title = defaultTitle;
        iconElement.href = defaultIcon;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [options.autoCloak, cloakTitle, cloakIcon, defaultTitle, defaultIcon]);

  useEffect(() => {
    if (options.autoCloak && !document.hidden) {
      document.title = defaultTitle;
      document.querySelector("link[rel~='icon']").href = defaultIcon;
    } else if (options.autoCloak && document.hidden) {
      document.title = cloakTitle;
      document.querySelector("link[rel~='icon']").href = cloakIcon;
    } else {
      document.title = cloakTitle;
      document.querySelector("link[rel~='icon']").href = cloakIcon;
    }
  }, [cloakTitle, cloakIcon, defaultTitle, defaultIcon, options.autoCloak]);

  const pages = [
    { path: '/', element: <Home /> },
    { path: '/materials', element: <Apps /> },
    { path: '/docs', element: <Games /> },
    { path: '/indev', element: <Loader /> },
    { path: '/settings', element: <Settings /> },
    { path: '/new', element: <New /> },
    { path: '*', element: <NotFound /> },
  ];

  return (
    <>
      <Routing pages={pages} />
      <style>{`
        body { 
          color: ${options.siteTextColor || '#a0b0c8'};
          background-image: radial-gradient(circle, rgba(${
            options.bgDesignColor || '66, 69, 73'
          }, 0.212) 3px, transparent 1px);
          background-color: ${options.bgColor || '#111827'};
        }
      `}</style>
    </>
  );
};

const App = () => (
  <OptionsProvider>
    <ThemedApp />
  </OptionsProvider>
);

export default App;

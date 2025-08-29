import Routing from './Routing';
import { OptionsProvider, useOptions } from './utils/optionsContext';
import './index.css';
import 'nprogress/nprogress.css';
import Loader from './pages/Loader';
import New from './pages/New';
import lazyLoad from './lazyWrapper';
import NotFound from './pages/NotFound';

const Home = lazyLoad(() => import('./pages/Home'));
const Apps = lazyLoad(() => import('./pages/Apps'));
const Games = lazyLoad(() => import('./pages/Games'));
const Settings = lazyLoad(() => import('./pages/Settings'));

const ThemedApp = () => {
  const { options } = useOptions();

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

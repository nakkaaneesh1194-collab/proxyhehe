import Nav from '../layouts/Nav';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOptions } from '/src/utils/optionsContext';
import appsData from '../data/apps.json';
import styles from '../styles/apps.module.css';
import theme from '../styles/theming.module.css';
import Pagination from '@mui/material/Pagination';
import clsx from 'clsx';

const Apps = ({ type = 'default', data = appsData, options }) => {
  const nav = useNavigate();
  const appsList = useMemo(() => data[type] || [], [data, type]);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState('categorical'); // me love categories
  const [page, setPage] = useState(1);
  const [showSort, setShowSort] = useState(false);
  const sortRef = useRef(null);
  const FALLBACK_ICON = './game_fallback.webp';
  useEffect(() => {
    const handler = (e) => {
      if (!sortRef.current) return;
      if (!sortRef.current.contains(e.target)) setShowSort(false);
    };
    window.addEventListener('pointerdown', handler);
    return () => window.removeEventListener('pointerdown', handler);
  }, []);
  const itemsPerPage = options.itemsPerPage || 20;

  const sortedApps = useMemo(() => {
    const withIndex = appsList.map((app, i) => ({ ...app, __index: i }));
    if (sortMode === 'alphabetical') {
      return [...withIndex].sort((a, b) => a.appName.localeCompare(b.appName, 'en', { sensitivity: 'base' }));
    }
    if (sortMode === 'categorical') {
      return [...withIndex].sort((a, b) => {
        const cat = (a.desc || '').localeCompare(b.desc || '', 'en', { sensitivity: 'base' });
        if (cat !== 0) return cat;
        return a.appName.localeCompare(b.appName, 'en', { sensitivity: 'base' });
      });
    }
    if (sortMode === 'newest') {
      // i am sure i could have made this better but whatever
      return [...withIndex].sort((a, b) => b.__index - a.__index);
    }
    return withIndex;
  }, [appsList, sortMode]);

  const filteredApps = useMemo(
    () =>
      sortedApps.filter((app) =>
        app.appName.toLowerCase().includes(query.toLowerCase()),
      ),
    [sortedApps, query],
  );

  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
  const paginatedApps = filteredApps.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (page > totalPages && totalPages > 0) setPage(1);

  const navApp = (url) => {
    if (url) {
      sessionStorage.setItem('query', url);
      nav('/indev');
    }
  };

  const txt = (t = '') => t.split('').join('\u200B');
  const searchBarConf = clsx(theme.appsSearchColor, theme[`theme-${options.theme || 'default'}`]);

  return (
    <div className={`${styles.appContainer} w-full mx-auto`}>
      <div className="w-full px-4 py-4 flex justify-center mt-3">
        <div
          className={clsx(
            'relative flex items-center gap-2.5 rounded-[10px] pl-3 pr-2 w-[600px] h-11',
            searchBarConf,
          )}
        >
          <Search className="w-4 h-4 shrink-0 ml-0.5" />
          <input
            type="text"
            placeholder={`Search ${appsList.length} ${type}`}
            autoComplete="off"
            className={clsx('flex-1 bg-transparent outline-hidden text-sm/10', searchBarConf)}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          {type !== 'apps' && (
            <div ref={sortRef} className="relative flex items-center">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={showSort}
                onClick={() => setShowSort((s) => !s)}
                className={clsx(
                  'flex items-center gap-1 text-xs md:text-sm rounded-md px-2 py-1 h-7',
                  'bg-[#ffffff10] hover:bg-[#ffffff18] active:bg-[#ffffff25] transition-colors',
                  'outline-none border border-white/15 cursor-pointer',
                )}
              >
                <span className="capitalize hidden sm:inline">
                  {sortMode === 'alphabetical'
                    ? 'Alphabetical'
                    : sortMode === 'categorical'
                    ? 'Categorical'
                    : 'Newest'}
                </span>
                <ChevronDown size={14} className={clsx('transition-transform', showSort && 'rotate-180')} />
              </button>
              {showSort && (
                <ul
                  role="listbox"
                  className={clsx(
                    'absolute right-0 top-[calc(100%+0.5rem)] z-20 w-44',
                    'rounded-md border border-white/15 shadow-lg p-1 backdrop-blur-md',
                    'flex flex-col gap-0.5',
                    theme.appsSearchColor,
                    theme[`theme-${options.theme || 'default'}`],
                  )}
                >
                  {[
                    { value: 'categorical', label: 'Categorical' },
                    { value: 'alphabetical', label: 'Alphabetical' },
                    { value: 'newest', label: 'Newest' },
                  ].map((opt) => (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={sortMode === opt.value}
                      onClick={() => {
                        setSortMode(opt.value);
                        setShowSort(false);
                        setPage(1);
                      }}
                      className={clsx(
                        'px-2 py-1.5 rounded-[6px] text-[0.72rem] sm:text-[0.8rem] select-none',
                        sortMode === opt.value
                          ? 'bg-[#ffffff18] text-white'
                          : 'text-white/75 hover:text-white hover:bg-[#ffffff12] cursor-pointer',
                        'transition-colors',
                      )}
                    >
                      {opt.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center pb-2">
        {paginatedApps.map((app) => (
          <div
            key={app.appName}
            className={clsx(
              styles.app,
              theme.appItemColor,
              theme[`theme-${options.theme || 'default'}`],
              app.disabled ? 'disabled cursor-not-allowed' : 'cursor-pointer',
            )}
            onClick={!app.disabled ? () => navApp(app.url) : undefined}
          >
            <img
              src={app.icon}
              alt={app.appName + ' icon'}
              className="w-20 h-20 rounded-[12px] mb-4 object-cover scale-[1.05]"
              draggable="false"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallbackApplied === '1') return; // prevent loops (note for fowntain bc i will forget)
                if (img.src !== FALLBACK_ICON) {
                  img.src = FALLBACK_ICON;
                  img.dataset.fallbackApplied = '1';
                }
              }}
            />
            <p className="text-m font-semibold">{txt(app.appName)}</p>
            <p className="text-sm mt-2">{txt(app.desc)}</p>
          </div>
        ))}
      </div>

      {filteredApps.length > itemsPerPage && (
        <div className="flex flex-col items-center pb-7">
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            shape="rounded"
            variant="outlined"
            sx={{
              '& .MuiPaginationItem-root': {
                color: options.paginationTextColor || '#9baec8',
                borderColor: options.paginationBorderColor || '#ffffff1c',
                backgroundColor: options.paginationBgColor || '#141d2b',
                fontFamily: 'SFProText',
              },
              '& .Mui-selected': {
                backgroundColor: `${options.paginationSelectedColor || '#75b3e8'} !important`,
                color: '#fff !important',
              },
            }}
          />
          <p className="text-xs text-grey/75 mt-4">{`Tip: You can change how many ${type} are displayed per page in Settings > Customize!`}</p>
        </div>
      )}
    </div>
  );
};

const AppLayout = ({ type }) => {
  const { options } = useOptions();
  const scroll = clsx(
    'scrollbar scrollbar-track-transparent scrollbar-thin',
    !options?.type || options.type === 'dark'
      ? 'scrollbar-thumb-gray-600'
      : 'scrollbar-thumb-gray-500',
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Nav />
      <div className={clsx('flex-1 overflow-y-auto', scroll)}>
        <Apps type={type} options={options} />
      </div>
    </div>
  );
};

export default AppLayout;

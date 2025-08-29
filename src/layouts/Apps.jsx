import Nav from '../layouts/Nav';
import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOptions } from '/src/utils/optionsContext';
import appsData from '../data/apps.json';
import styles from '../styles/apps.module.css';
import theme from '../styles/theming.module.css';
import Pagination from '@mui/material/Pagination';
import clsx from 'clsx';

const Apps = ({ type = 'default', data = appsData, options }) => {
  const nav = useNavigate();
  const appsList = data[type] || [];
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = options.itemsPerPage || 20;

  const filteredApps = useMemo(
    () => appsList.filter((app) => app.appName.toLowerCase().includes(query.toLowerCase())),
    [appsList, query],
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
            'flex items-center gap-2.5 rounded-[10px] px-3 w-[600px] h-11',
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
              className="w-20 h-20 rounded-[12px] mb-4 object-cover scale-[1.05]"
              draggable="false"
            />
            <p className="text-m font-semibold">{txt(app.appName)}</p>
            <p className="text-sm mt-2">{txt(app.desc)}</p>
          </div>
        ))}
      </div>

      {filteredApps.length > itemsPerPage && (
        <div className="flex justify-center pb-7">
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

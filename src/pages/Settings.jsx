import clsx from 'clsx';
import { useState } from 'react';
import Nav from '../layouts/Nav';
import theme from '../styles/theming.module.css';
import { Search, HatGlasses, Palette, Globe, Wrench } from 'lucide-react';
import { useOptions } from '/src/utils/optionsContext';
import RenderSetting from '../components/Settings';
import 'movement.css';

const Settings = () => {
  const { options } = useOptions();
  const [query, setQuery] = useState('');
  const [content, setContent] = useState('Privacy');

  const setContentHelp = (name) => {
    if (name !== content) {
      setContent(name);
      setQuery('');
    }
  };

  const settings = [
    {
      name: 'Privacy',
      icon: HatGlasses,
      keywords: ['title', 'cloak', 'cloaking', 'tab cloak', 'about', 'about:blank', 'blank'],
    },
    {
      name: 'Customize',
      icon: Palette,
      keywords: [
        'theme',
        'color',
        'appearance',
        'ui',
        'interface',
        'games',
        'pages',
        'apps',
        'scale',
        'nav',
        'navigation bar',
        'nav bar',
        'navbar',
        'size',
        'donate',
        'donation',
      ],
    },
    {
      name: 'Browsing',
      icon: Globe,
      keywords: ['tabs', 'tab', 'proxy', 'search engine', 'engine'],
    },
    {
      name: 'Advanced',
      icon: Wrench,
      keywords: [
        'wisp',
        'proxy',
        'ultraviolet',
        'bare',
        'leave confirmation',
        'debug',
        'experimental',
        'inspect',
      ],
    },
  ];

  const filter = settings.filter(
    (setting) =>
      setting.name.toLowerCase().includes(query.toLowerCase()) ||
      setting.keywords.some((kw) => kw.toLowerCase().includes(query.toLowerCase())),
  );

  const showKeywordTooltip =
    query.trim() &&
    filter.length > 0 &&
    !filter.some((setting) => setting.name.toLowerCase().includes(query.toLowerCase())) &&
    filter.some((setting) =>
      setting.keywords.some((kw) => kw.toLowerCase().includes(query.toLowerCase())),
    );

  return (
    <div className="flex flex-col h-screen">
      <div className="shrink-0">
        <Nav />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={clsx(
            theme[`settings-panelColor`],
            theme[`theme-${options.theme || 'default'}`],
            'w-60 shrink-0 overflow-y-auto p-2 pt-3',
          )}
          data-m="slide-in-left"
          data-m-duration="0.5"
        >
          <div
            className="flex items-center max-w-52 h-7 rounded-md mx-auto px-2"
            style={{ backgroundColor: options.settingsSearchBar || '#3c475a' }}
            data-m="fade-in"
            data-m-delay="0.2"
          >
            <Search className="w-4 mr-1.5" />
            <input
              type="text"
              placeholder="Filter settings"
              className="bg-transparent outline-hidden w-full text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {showKeywordTooltip && (
            <div className="mt-2 text-xs text-gray-400 text-center px-2">
              May contain what you're looking for
            </div>
          )}

          <div className="flex flex-col gap-3 mt-5">
            {filter.map(({ name, icon: Icon }, key) => (
              <div
                key={key}
                className={clsx(
                  'w-full h-10 flex items-center rounded-md duration-75 px-5 cursor-pointer',
                  content !== name && 'bg-transparent hover:bg-[#ffffff23]',
                )}
                style={{
                  backgroundColor:
                    content === name
                      ? options.settingsPanelItemBackgroundColor || '#405a77'
                      : undefined,
                }}
                onClick={() => setContentHelp(name)}
                data-m="fade-in-up"
                data-m-delay={`${0.3 + key * 0.1}`}
              >
                <Icon className="w-5" />
                <p className="mx-4">{name}</p>
              </div>
            ))}
          </div>
        </div>
        <RenderSetting setting={content} />
      </div>
    </div>
  );
};

export default Settings;

import clsx from 'clsx';
import { useState, useMemo } from 'react';
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
      items: [
        {
          name: 'Site Title',
          description: 'This setting allows you to change the site\'s tab title and icon.',
          keywords: ['tab', 'title', 'icon', 'cloak', 'disguise', 'hide'],
        },
        {
          name: 'Open in AB',
          description: 'This will open the site into an about:blank tab. Make sure popups are enabled.',
          keywords: ['about:blank', 'blank', 'popup', 'new window', 'stealth'],
        },
        {
          name: 'Auto Cloak',
          description: 'Automatically apply the selected cloak when you switch tabs, restore original when you return.',
          keywords: ['auto', 'automatic', 'cloak', 'switch', 'tab', 'visibility', 'hidden', 'away'],
        },
      ],
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
      items: [
        {
          name: 'Site Theme',
          description: 'Customize the appearance of the website by selecting a theme.',
          keywords: ['theme', 'dark', 'light', 'color', 'appearance', 'style', 'look'],
        },
        {
          name: 'Apps per Page',
          description: 'Number of apps to show per page ("All" will show everything).',
          keywords: ['pagination', 'apps', 'games', 'items', 'per page', 'limit', 'display'],
        },
        {
          name: 'Navigation Scale',
          description: 'Scale navigation bar size (logo & font) globally.',
          keywords: ['nav', 'navigation', 'scale', 'size', 'logo', 'font', 'zoom'],
        },
        {
          name: 'Donation button',
          description: 'Toggle whether you want the "Support us" button to show.',
          keywords: ['donate', 'donation', 'support', 'button', 'hide', 'toggle'],
        },
      ],
    },
    {
      name: 'Browsing',
      icon: Globe,
      keywords: ['tabs', 'tab', 'proxy', 'search engine', 'engine'],
      items: [
        {
          name: 'Search Engine',
          description: 'Choose the default search engine used for queries.',
          keywords: ['search', 'engine', 'google', 'bing', 'duckduckgo', 'yahoo', 'default'],
        },
      ],
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
      items: [
        {
          name: 'beforeunload Event',
          description: 'Show a confirmation when attempting to leave the site.',
          keywords: ['leave', 'exit', 'confirmation', 'beforeunload', 'warning', 'prompt'],
        },
        {
          name: 'Wisp Config',
          description: 'Configure the websocket server location.',
          keywords: ['wisp', 'websocket', 'server', 'proxy', 'config', 'url', 'backend'],
        },
      ],
    },
  ];

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return { categories: settings, matchedItems: new Map() };
    }

    const lowerQuery = query.toLowerCase();
    const matchedItems = new Map();
    const matchedCategories = new Set();

    settings.forEach((category) => {
      const categoryMatches =
        category.name.toLowerCase().includes(lowerQuery) ||
        category.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery));

      if (categoryMatches) {
        matchedCategories.add(category.name);
      }

      if (category.items) {
        category.items.forEach((item) => {
          const itemMatches =
            item.name.toLowerCase().includes(lowerQuery) ||
            item.description.toLowerCase().includes(lowerQuery) ||
            item.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery));

          if (itemMatches) {
            matchedCategories.add(category.name);
            if (!matchedItems.has(category.name)) {
              matchedItems.set(category.name, []);
            }
            matchedItems.get(category.name).push(item.name);
          }
        });
      }
    });

    const filteredCategories = settings.filter((cat) => matchedCategories.has(cat.name));
    return { categories: filteredCategories, matchedItems };
  }, [query]);

  const { categories: filter, matchedItems } = searchResults;

  const showMatchedItems = query.trim() && matchedItems.size > 0;
  const totalMatchedItems = Array.from(matchedItems.values()).reduce(
    (sum, items) => sum + items.length,
    0,
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

          {showMatchedItems && (
            <div className="mt-2 text-xs text-gray-400 text-center px-2">
              Found {totalMatchedItems} matching setting{totalMatchedItems !== 1 ? 's' : ''}
            </div>
          )}

          <div className="flex flex-col gap-3 mt-5">
            {filter.map(({ name, icon: Icon }, key) => (
              <div key={key}>
                <div
                  className={clsx(
                    'w-full min-h-[2.5rem] flex items-center rounded-md duration-75 px-5 cursor-pointer',
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
                  <Icon className="w-5 shrink-0" />
                  <div className="mx-4 flex-1">
                    <p>{name}</p>
                    {matchedItems.has(name) && matchedItems.get(name).length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {matchedItems.get(name).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <RenderSetting setting={content} searchQuery={query} />
      </div>
    </div>
  );
};

export default Settings;

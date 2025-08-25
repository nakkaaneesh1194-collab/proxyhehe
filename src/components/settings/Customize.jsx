import { useOptions } from '/src/utils/optionsContext';
import { themeConfig, appsPerPageConfig, navScaleConfig } from '/src/utils/config';
import HighlightedItem from './components/HighlightedItem';
import { useEffect, useRef } from 'react';

const findOrFallback = (config, predicate, fallbackIndex = 0) => {
  const found = config.find(predicate);
  return found ? found.value : config[fallbackIndex].value;
};

const Customize = ({ searchQuery }) => {
  const { options, updateOption } = useOptions();
  const previousThemeRef = useRef(options.themeName);

  useEffect(() => {
    if (previousThemeRef.current !== options.themeName && previousThemeRef.current !== undefined) {
      const items = document.querySelectorAll('[data-m]');
      items.forEach((item, index) => {
        item.setAttribute('data-m', 'bounce-in');
        item.setAttribute('data-m-delay', `${index * 0.1}`);
        setTimeout(() => {
          item.setAttribute('data-m', 'fade-in-up');
          item.removeAttribute('data-m-delay');
        }, 1000);
      });
    }
    previousThemeRef.current = options.themeName;
  }, [options.themeName]);

  const update = (val) => {
    if (val && typeof val === 'object') {
      updateOption(val);
    }
  };

  const selectedTheme = findOrFallback(
    themeConfig,
    (c) => c.value?.themeName === options.themeName,
    0,
  );

  const selectedAppsPerPage = findOrFallback(
    appsPerPageConfig,
    (c) => c.value.itemsPerPage === (options.itemsPerPage ?? 20),
    2,
  );

  const selectedNavScale = findOrFallback(
    navScaleConfig,
    (c) => c.value.navScale === (options.navScale ?? 1),
    3,
  );

  return (
    <>
      <HighlightedItem
        searchQuery={searchQuery}
        config={themeConfig}
        action={update}
        value={selectedTheme}
        name="Site Theme"
        description="Customize the appearance of the website by selecting a theme."
        type="select"
      />

      <HighlightedItem
        searchQuery={searchQuery}
        config={appsPerPageConfig}
        action={update}
        value={selectedAppsPerPage}
        name="Apps per Page"
        description='Number of apps to show per page ("All" will show everything).'
        type="select"
      />

      <HighlightedItem
        searchQuery={searchQuery}
        config={navScaleConfig}
        action={update}
        value={selectedNavScale}
        name="Navigation Scale"
        description="Scale navigation bar size (logo & font) globally."
        type="select"
      />
      <HighlightedItem
        searchQuery={searchQuery}
        type="switch"
        name="Donation button"
        description='Toggle whether you want the "Support us" button to show.'
        action={(b) => setTimeout(() => updateOption({ donationBtn: b }), 100)}
        value={options.donationBtn ?? true}
      />
    </>
  );
};

export default Customize;

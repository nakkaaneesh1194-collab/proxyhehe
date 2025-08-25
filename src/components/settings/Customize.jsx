import { useOptions } from '/src/utils/optionsContext';
import { themeConfig, appsPerPageConfig, navScaleConfig } from '/src/utils/config';
import SettingsContainerItem from './components/ContainerItem';

const findOrFallback = (config, predicate, fallbackIndex = 0) => {
  const found = config.find(predicate);
  return found ? found.value : config[fallbackIndex].value;
};

const Customize = () => {
  const { options, updateOption } = useOptions();

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
      <SettingsContainerItem
        config={themeConfig}
        action={update}
        value={selectedTheme}
        name="Site Theme"
        type="select"
      >
        Customize the appearance of the website by selecting a theme.
      </SettingsContainerItem>

      <SettingsContainerItem
        config={appsPerPageConfig}
        action={update}
        value={selectedAppsPerPage}
        name="Apps per Page"
        type="select"
      >
        Number of apps to show per page ("All" will show everything).
      </SettingsContainerItem>

      <SettingsContainerItem
        config={navScaleConfig}
        action={update}
        value={selectedNavScale}
        name="Navigation Scale"
        type="select"
      >
        Scale navigation bar size (logo & font) globally.
      </SettingsContainerItem>
      <SettingsContainerItem
        type="switch"
        name="Donation button"
        action={(b) => setTimeout(() => updateOption({ donationBtn: b }), 100)}
        value={options.donationBtn ?? true}
      >
        Toggle whether you want the "Support us" button to show.
      </SettingsContainerItem>
    </>
  );
};

export default Customize;

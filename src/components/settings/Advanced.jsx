import SettingsContainerItem from './components/ContainerItem';
import { prConfig } from '/src/utils/config';
import { useOptions } from '/src/utils/optionsContext';

const Advanced = () => {
  const { options, updateOption } = useOptions();

  return (
    <>
      <SettingsContainerItem
        type="switch"
        name="beforeunload Event"
        action={(b) => {
          setTimeout(() => updateOption({ beforeUnload: b }));
          location.reload();
        }}
        value={!!options.beforeUnload}
      >
        Show a confirmation when attempting to leave the site.
      </SettingsContainerItem>
      <SettingsContainerItem
        action={(b) => updateOption({ wServer: b })}
        value={options.wServer || prConfig.wisp}
        name="Wisp Config"
        type="input"
      >
        Configure the websocket server location.
      </SettingsContainerItem>
    </>
  );
};

export default Advanced;

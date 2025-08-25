import HighlightedItem from './components/HighlightedItem';
import { prConfig } from '/src/utils/config';
import { useOptions } from '/src/utils/optionsContext';

const Advanced = ({ searchQuery }) => {
  const { options, updateOption } = useOptions();

  return (
    <>
      <HighlightedItem
        searchQuery={searchQuery}
        type="switch"
        name="beforeunload Event"
        description="Show a confirmation when attempting to leave the site."
        action={(b) => {
          setTimeout(() => updateOption({ beforeUnload: b }));
          location.reload();
        }}
        value={!!options.beforeUnload}
      />
      <HighlightedItem
        searchQuery={searchQuery}
        action={(b) => updateOption({ wServer: b })}
        value={options.wServer || prConfig.wisp}
        name="Wisp Config"
        description="Configure the websocket server location."
        type="input"
      />
    </>
  );
};

export default Advanced;

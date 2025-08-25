import { useOptions } from '/src/utils/optionsContext';
import { searchConfig } from '/src/utils/config';
import SettingsContainerItem from './components/ContainerItem';

const Browsing = () => {
  const { options, updateOption } = useOptions();

  const selectedSearchConfig = () => {
    return (
      searchConfig.find(
        (c) => c.value && typeof c.value === 'object' && c.value.engine === options.engine,
      ) || searchConfig[0]
    );
  };

  const searchAction = (value) => {
    if (value && typeof value === 'object') {
      updateOption(value);
    }
  };

  return (
    <>
      <SettingsContainerItem
        config={searchConfig}
        action={searchAction}
        value={selectedSearchConfig().value}
        name="Search Engine"
        type="select"
      >
        Choose the default search engine used for queries.
      </SettingsContainerItem>
    </>
  );
};

export default Browsing;
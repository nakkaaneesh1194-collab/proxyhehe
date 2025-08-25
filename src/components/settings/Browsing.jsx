import { useOptions } from '/src/utils/optionsContext';
import { searchConfig } from '/src/utils/config';
import HighlightedItem from './components/HighlightedItem';

const Browsing = ({ searchQuery }) => {
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
      <HighlightedItem
        searchQuery={searchQuery}
        config={searchConfig}
        action={searchAction}
        value={selectedSearchConfig().value}
        name="Search Engine"
        description="Choose the default search engine used for queries."
        type="select"
      />
    </>
  );
};

export default Browsing;
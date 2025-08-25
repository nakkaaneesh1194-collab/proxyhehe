import HighlightedItem from './components/HighlightedItem';
import { meta } from '/src/utils/config';
import { useOptions } from '/src/utils/optionsContext';

const Privacy = ({ searchQuery }) => {
  const { options, updateOption } = useOptions();

  const selectedMeta = () => {
    return (
      meta.find(
        (c) => c.value && typeof c.value === 'object' && c.value.tabName === options.tabName,
      ) || meta[0]
    );
  };

  return (
    <>
      <HighlightedItem
        searchQuery={searchQuery}
        name="Site Title"
        description="This setting allows you to change the site's tab title and icon."
        config={meta}
        value={selectedMeta().value}
        type="select"
        action={(value) => {
          updateOption(value);
          const selectedOption = meta.find(m => m.value === value);
          if (selectedOption && selectedOption.option === 'Default' && options.autoCloak) {
            updateOption({ autoCloak: false });
          }
        }}
      />
      <HighlightedItem
        searchQuery={searchQuery}
        type="switch"
        name="Open in AB"
        description="This will open the site into an about:blank tab. Make sure popups are enabled."
        action={(b) => setTimeout(() => updateOption({ aboutBlank: b }), 100)}
        value={options.aboutBlank}
      />
      <HighlightedItem
        searchQuery={searchQuery}
        type="switch"
        name="Auto Cloak"
        description="Automatically apply the selected cloak when you switch tabs, restore original when you return."
        action={(b) => setTimeout(() => updateOption({ autoCloak: b }), 100)}
        value={options.autoCloak}
        disabled={selectedMeta().option === 'Default'}
      />
    </>
  );
};

export default Privacy;

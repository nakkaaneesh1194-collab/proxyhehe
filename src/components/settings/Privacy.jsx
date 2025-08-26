import HighlightedItem from './components/HighlightedItem';
import { meta } from '/src/utils/config';
import { useOptions } from '/src/utils/optionsContext';
import KeyboardShortcut from './components/KeyboardShortcut';

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
      <HighlightedItem
        searchQuery={searchQuery}
        type="switch"
        name="Panic Button"
        description="Enable a keyboard shortcut to quickly redirect to a safe site."
        action={(b) => {
          updateOption({ panicButton: b });
          if (!b) {
            updateOption({ panicShortcut: null, panicUrl: null });
          } else if (!options.panicShortcut) {
            updateOption({ panicShortcut: ['Alt', 'P'], panicUrl: 'https://classroom.google.com' });
          }
        }}
        value={options.panicButton || false}
      />
      {options.panicButton && (
        <>
          <div
            className="flex items-center justify-between w-full h-20 rounded-lg pl-5 p-3"
            style={{ backgroundColor: options.settingsContainerColor || '#1f324e' }}
            data-m="fade-in-up"
            data-m-duration="0.3"
          >
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-[1rem] font-[SFProText]">Panic Shortcut</p>
              <p className="text-[0.75rem] opacity-60">Press these keys to trigger panic mode</p>
            </div>
            <div className="flex-shrink-0 ml-4">
              <KeyboardShortcut 
                value={options.panicShortcut || ['Alt', 'P']}
                onChange={(keys) => {
                  updateOption({ panicShortcut: keys });
                }}
              />
            </div>
          </div>
          <HighlightedItem
            searchQuery={searchQuery}
            type="input"
            name="Panic URL"
            description="The website to redirect to when panic button is triggered"
            action={(value) => {
              updateOption({ panicUrl: value });
            }}
            value={options.panicUrl || 'https://classroom.google.com'}
          />
        </>
      )}
    </>
  );
};

export default Privacy;

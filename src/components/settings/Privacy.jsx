import SettingsContainerItem from './components/ContainerItem';
import { meta } from '/src/utils/config';
import { useOptions } from '/src/utils/optionsContext';

const Privacy = () => {
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
      <SettingsContainerItem
        name="Site Title"
        config={meta}
        value={selectedMeta().value}
        type="select"
        action={(value) => updateOption(value)}
      >
        This setting allows you to change the site's tab title and icon.
      </SettingsContainerItem>
      <SettingsContainerItem
        type="switch"
        name="Open in AB"
        action={(b) => setTimeout(() => updateOption({ aboutBlank: b }), 100)}
        value={options.aboutBlank}
      >
        This will open the site into an about:blank tab. Make sure popups are enabled.
      </SettingsContainerItem>
    </>
  );
};

export default Privacy;

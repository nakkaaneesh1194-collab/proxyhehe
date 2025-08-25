import styles from '/src/styles/settings.module.css';
import ComboBox from './Combobox';
import Switch from './Switch';
import Input from './Input'
import { useOptions } from '/src/utils/optionsContext';

const SettingsContainerItem = ({ config, action, name, type, children, value }) => {
  const { options } = useOptions();

  return (
    <div
      className="flex items-center justify-between w-full h-20 rounded-lg pl-5 p-3"
      style={{ backgroundColor: options.settingsContainerColor || '#1f324e' }}
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-[1rem] font-[SFProText] truncate">{name}</p>
        <p className={`${styles.desc} truncate`}>{children}</p>
      </div>

      <div className="flex-shrink-0 ml-4">
        {type == 'select' && (
          <ComboBox config={config} action={action} selectedValue={value} maxW={13} />
        )}
        {type == 'switch' && <Switch action={action} value={value} />}
        {type == 'input' && <Input onChange={action} defValue={value} />}
      </div>
    </div>
  );
};

export default SettingsContainerItem
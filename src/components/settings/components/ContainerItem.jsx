import styles from '/src/styles/settings.module.css';
import ComboBox from './Combobox';
import Switch from './Switch';
import Input from './Input'
import { useOptions } from '/src/utils/optionsContext';
import { useRef } from 'react';
import 'movement.css';

const SettingsContainerItem = ({ config, action, name, type, children, value, disabled }) => {
  const { options } = useOptions();
  const comboBoxRef = useRef(null);
  const switchRef = useRef(null);
  const inputRef = useRef(null);

  const handleContainerClick = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) {
      return;
    }

    if (type === 'select' && comboBoxRef.current) {
      const button = comboBoxRef.current.querySelector('button');
      if (button) {
        button.click();
      }
    } else if (type === 'switch' && switchRef.current && !disabled) {
      const button = switchRef.current.querySelector('button');
      if (button) {
        button.click();
      }
    } else if (type === 'input' && inputRef.current) {
      const input = inputRef.current.querySelector('input');
      if (input) {
        input.focus();
        input.select();
      }
    }
  };

  return (
    <div
      className={`flex items-center justify-between w-full h-20 rounded-lg pl-5 p-3 transition-opacity ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-95'}`}
      style={{ backgroundColor: options.settingsContainerColor || '#1f324e' }}
      data-m="fade-in-up"
      data-m-duration="0.3"
      onClick={handleContainerClick}
    >
      <div className="min-w-0 flex-1 overflow-hidden pointer-events-none">
        <p className="text-[1rem] font-[SFProText] truncate">{name}</p>
        <p className={`${styles.desc} truncate`}>{children}</p>
      </div>

      <div className="flex-shrink-0 ml-4">
        {type == 'select' && (
          <div ref={comboBoxRef}>
            <ComboBox config={config} action={action} selectedValue={value} maxW={13} />
          </div>
        )}
        {type == 'switch' && (
          <div ref={switchRef}>
            <Switch action={action} value={value} disabled={disabled} />
          </div>
        )}
        {type == 'input' && (
          <div ref={inputRef}>
            <Input onChange={action} defValue={value} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsContainerItem
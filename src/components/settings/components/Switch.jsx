import clsx from 'clsx';
import { Switch } from '@headlessui/react';
import { useState } from 'react';
import { useOptions } from '/src/utils/optionsContext';

export default function SwitchComponent({ action, value, disabled }) {
  const { options } = useOptions();
  const [enabled, setEnabled] = useState(value);
  const switchChange = (value) => {
    if (disabled) return;
    setEnabled(value);
    action(value);
  };
  return (
    <Switch
      checked={enabled}
      onChange={switchChange}
      disabled={disabled}
      className={clsx(
        "group relative flex h-7 w-14 mr-5 rounded-full p-1 ease-in-out focus:outline-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
      style={{
        backgroundColor: enabled ? options.switchEnabledColor || '#4c6c91' : options.switchColor || '#ffffff1a',
        transition: 'background-color 0.2s ease-in-out',
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out group-data-checked:translate-x-7"
      />
    </Switch>
  );
}

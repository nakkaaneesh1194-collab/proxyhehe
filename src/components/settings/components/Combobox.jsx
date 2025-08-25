import clsx from 'clsx';
import {
  Combobox,
  ComboboxButton,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react';
import { ChevronDown, Check } from 'lucide-react';
import { useOptions } from '/src/utils/optionsContext';
import { createPortal } from 'react-dom';
import { useRef, useState, useEffect } from 'react';

const ComboBox = ({
  config = [],
  selectedValue,
  action,
  maxW = 40,
  placeholder = 'Choose an option',
}) => {
  const { options } = useOptions();
  const buttonRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRect, setButtonRect] = useState(null);

  const getOptionId = (val) =>
    val && typeof val === 'object' ? val.themeName || val.id || JSON.stringify(val) : val;

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const maxWidth = Math.min(
        rect.width * 1.5,
        viewportWidth - rect.left - 20,
        300
      );
      
      let left = rect.left;
      if (left + maxWidth > viewportWidth - 20) {
        left = viewportWidth - maxWidth - 20;
      }
      
      setButtonRect({
        ...rect,
        left,
        maxWidth,
        bottom: rect.bottom,
        width: rect.width
      });
    }
  }, [isOpen]);

  return (
    <div
      className="relative w-full"
      style={{
        maxWidth: `${maxW}rem`,
      }}
    >
      <Combobox
        value={selectedValue}
        onChange={action}
        by={(a, b) => getOptionId(a) === getOptionId(b)}
      >
        {({ open }) => {
          if (open !== isOpen) setIsOpen(open);
          return (
            <>
              <div
                ref={buttonRef}
                className={clsx('relative w-full', 'rounded-md border')}
                style={{
                  backgroundColor: options.settingsDropdownColor || '#1a2a42',
                }}
              >
                <ComboboxButton
                  className={clsx('flex w-full h-10 items-center justify-center', 'px-3')}
                >
                  <span className={clsx('flex-1', 'text-[0.9rem] truncate text-center')}>
                    {selectedValue
                      ? config.find((c) => getOptionId(c.value) === getOptionId(selectedValue))?.option ||
                        placeholder
                      : placeholder}
                  </span>
                  <ChevronDown size={17} className="flex-shrink-0 ml-2" />
                </ComboboxButton>
              </div>

              {open && buttonRect && createPortal(
                <ComboboxOptions
                  static
                  className={clsx(
                    'fixed z-[9999]',
                    'flex flex-col gap-1',
                    'max-h-60 overflow-y-auto overflow-x-hidden',
                    'rounded-[0.4rem] border shadow-lg',
                    '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
                  )}
                  style={{
                    backgroundColor: options.settingsDropdownColor || '#1a2a42',
                    padding: '0.4rem',
                    top: `${buttonRect.bottom + 4}px`,
                    left: `${buttonRect.left}px`,
                    width: 'max-content',
                    minWidth: `${buttonRect.width}px`,
                    maxWidth: `${buttonRect.maxWidth}px`,
                  }}
                >
                  {config.map((cfg) => (
                    <ComboboxOption
                      value={cfg.value}
                      key={getOptionId(cfg.value)}
                      className={clsx(
                        'flex items-center justify-center',
                        'cursor-pointer hover:bg-[#ffffff15]',
                        'px-2 py-2 rounded-md',
                      )}
                    >
                      {({ selected }) => (
                        <>
                          <span
                            className={clsx('flex items-center justify-center', 'w-[20px] flex-shrink-0')}
                          >
                            {selected && <Check size={16} />}
                          </span>
                          <p className={clsx('ml-2 text-[0.88rem] text-center truncate')}>
                            {cfg.option}
                          </p>
                        </>
                      )}
                    </ComboboxOption>
                  ))}
                </ComboboxOptions>,
                document.body
              )}
            </>
          );
        }}
      </Combobox>
    </div>
  );
};

export default ComboBox;

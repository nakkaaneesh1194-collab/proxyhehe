import { useState, useRef, useEffect } from 'react';
import { useOptions } from '/src/utils/optionsContext';
import styles from '/src/styles/settings.module.css';

const KeyboardShortcut = ({ onChange, value }) => {
  const { options } = useOptions();
  const [isRecording, setIsRecording] = useState(false);
  const [keys, setKeys] = useState(value || []);
  const inputRef = useRef(null);

  useEffect(() => {
    setKeys(value || []);
  }, [value]);

  const formatKeys = (keysArray) => {
    if (!keysArray || keysArray.length === 0) return 'Click to set';
    return keysArray.join(' + ');
  };

  const handleKeyDown = (e) => {
    if (!isRecording) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const key = e.key;
    
    if (key === 'Escape') {
      setIsRecording(false);
      setKeys([]);
      onChange([]);
      return;
    }
    
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      const recordedKeys = [];
      
      if (e.ctrlKey) recordedKeys.push('Ctrl');
      if (e.altKey) recordedKeys.push('Alt');
      if (e.shiftKey) recordedKeys.push('Shift');
      if (e.metaKey) recordedKeys.push('Meta');
      
      if (key.length === 1) {
        recordedKeys.push(key.toUpperCase());
      } else {
        recordedKeys.push(key);
      }
      
      setKeys(recordedKeys);
      onChange(recordedKeys);
      setIsRecording(false);
    }
  };

  const handleClick = () => {
    setIsRecording(true);
    inputRef.current?.focus();
  };

  const clearShortcut = (e) => {
    e.stopPropagation();
    setKeys([]);
    onChange([]);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        ref={inputRef}
        type="button"
        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
          isRecording 
            ? 'ring-2 ring-offset-1' 
            : ''
        }`}
        style={{
          backgroundColor: options.settingsPanelItemBackgroundColor || '#405a77',
          color: options.siteTextColor || '#a0b0c8',
          ringColor: isRecording ? (options.navItemActive || '#c1d4f1') : 'transparent',
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onBlur={() => setIsRecording(false)}
      >
        {isRecording ? 'Press keys...' : formatKeys(keys)}
      </button>
      {keys.length > 0 && (
        <button
          type="button"
          onClick={clearShortcut}
          className="p-1 rounded hover:opacity-70 transition-opacity"
          style={{
            backgroundColor: options.settingsPanelItemBackgroundColor || '#405a77',
            color: options.siteTextColor || '#a0b0c8',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default KeyboardShortcut;
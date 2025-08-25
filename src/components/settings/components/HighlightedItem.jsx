import { useEffect, useState } from 'react';
import SettingsContainerItem from './ContainerItem';
import styles from '/src/styles/highlight.module.css';
import clsx from 'clsx';
import 'movement.css';

const HighlightedItem = ({ searchQuery, name, description, ...props }) => {
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    if (!searchQuery || !searchQuery.trim()) {
      setIsHighlighted(false);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const matches =
      name.toLowerCase().includes(lowerQuery) ||
      description.toLowerCase().includes(lowerQuery);

    setIsHighlighted(matches);
  }, [searchQuery, name, description]);

  return (
    <div className={clsx(styles.highlightContainer, isHighlighted && styles.highlighted)}>
      {isHighlighted && (
        <>
          <div className={styles.pulseGlow} />
          <div className={styles.highlightOverlay} />
        </>
      )}
      <SettingsContainerItem name={name} {...props}>
        {description}
      </SettingsContainerItem>
    </div>
  );
};

export default HighlightedItem;
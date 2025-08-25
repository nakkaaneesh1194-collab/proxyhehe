import clsx from 'clsx';
import Privacy from './settings/Privacy';
import Customize from './settings/Customize';
import Browsing from './settings/Browsing';
import Advanced from './settings/Advanced';
import theme from '/src/styles/theming.module.css';
import { useOptions } from '/src/utils/optionsContext';
import 'movement.css';

const Setting = ({ setting, searchQuery }) => {
  const { options } = useOptions();

  const Container = ({ children }) => {
    return (
      <div
        className={clsx(
          theme[`settings-contentColor`],
          theme[`theme-${options.theme || 'default'}`],
          'flex flex-1 flex-col gap-7 overflow-y-auto p-10',
        )}
        data-m="fade-in"
        data-m-duration="0.4"
      >
        {children}
      </div>
    );
  };
  return (
    <>
      <Container>
        {setting === 'Privacy' && <Privacy searchQuery={searchQuery} />}
        {setting === 'Customize' && <Customize searchQuery={searchQuery} />}
        {setting === 'Browsing' && <Browsing searchQuery={searchQuery} />}
        {setting === 'Advanced' && <Advanced searchQuery={searchQuery} />}
      </Container>
    </>
  );
};

export default Setting;
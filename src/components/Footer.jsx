import { useOptions } from '../utils/optionsContext';

const Footer = () => {
  const { options } = useOptions();
  return (
    options.donationBtn !== false && (
      <div className="w-full fixed bottom-0 flex items-end justify-end p-2">
        <a href="https://www.buymeacoffee.com/dogubdev" target="_blank" rel="noopener noreferrer">
          <img
            src="https://img.buymeacoffee.com/button-api/?text=Support us&emoji=☕&slug=dogubdev&button_colour=40DCA5&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00"
            alt="Support us"
            className="w-32 h-auto"
          />
        </a>
      </div>
    )
  );
};

export default Footer;

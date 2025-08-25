import { useEffect, useRef } from 'react';
import { useOptions } from '/src/utils/optionsContext';
import 'movement.css';

const ThemeTransition = () => {
  const { options } = useOptions();
  const previousThemeRef = useRef(options.theme);
  const transitionRef = useRef(null);

  useEffect(() => {
    if (previousThemeRef.current !== options.theme && previousThemeRef.current !== undefined) {
      if (transitionRef.current) {
        transitionRef.current.remove();
      }

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
          transparent 0%, 
          ${options.navItemActive || '#c1d4f1'}20 10%,
          ${options.navItemActive || '#c1d4f1'}40 50%,
          ${options.navItemActive || '#c1d4f1'}20 90%,
          transparent 100%
        );
        z-index: 9999;
        pointer-events: none;
        animation: sweepRight 0.8s ease-out forwards;
      `;

      const style = document.createElement('style');
      style.textContent = `
        @keyframes sweepRight {
          0% {
            left: -100%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }


        .theme-transition-element {
          animation: fadeInScale 0.6s ease-out;
        }

        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `;

      document.head.appendChild(style);
      document.body.appendChild(overlay);
      transitionRef.current = overlay;

      const elements = document.querySelectorAll('[class*="theme-"], [style*="background"], [style*="color"]');
      elements.forEach((el, index) => {
        const delay = Math.min(index * 10, 300);
        el.style.transition = `all 0.4s ease-out ${delay}ms`;
      });


      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        if (style.parentNode) {
          style.remove();
        }
        
        elements.forEach(el => {
          el.style.transition = '';
        });
        
        transitionRef.current = null;
      }, 1000);
    }

    previousThemeRef.current = options.theme;
  }, [options.theme, options.navItemActive]);

  return null;
};

export default ThemeTransition;
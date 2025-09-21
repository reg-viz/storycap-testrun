import type { BrowserScreenshotHook } from './types';

/**
 * Creates hook that disables CSS animations and transitions during screenshot capture
 */
export const createAnimationsHook = (): BrowserScreenshotHook => ({
  async setup(_) {
    const style = document.createElement('style');
    style.innerHTML = `
        *,
        *::before,
        *::after {
          transition: none !important;
          animation: none !important;
        }
      `;
    style.id = '::x-storycap-animations';
    document.head.appendChild(style);
  },

  async postCapture(_) {
    document.getElementById('::x-storycap-animations')?.remove();
  },
});

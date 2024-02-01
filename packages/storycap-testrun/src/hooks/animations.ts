import type { ScreenshotHook } from '../hook';

export const createAnimationsHook = (): ScreenshotHook => ({
  async setup(page) {
    await page.evaluate(() => {
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
    });
  },

  async postCapture(page) {
    await page.evaluate(() => {
      document.getElementById('::x-storycap-animations')?.remove();
    });
  },
});

import type { ScreenshotHook } from '../hook';
import type { ScreenshotMaskConfig } from '../parameters';

export const createMaskingHook = (
  config: ScreenshotMaskConfig,
): ScreenshotHook => ({
  async preCapture(page) {
    await page.evaluate(
      ([selector, color]) => {
        document.querySelectorAll(selector!).forEach((el) => {
          const rect = el.getBoundingClientRect();
          const mask = document.createElement('x-storycap-mask');
          mask.style.position = 'absolute';
          mask.style.top = `${rect.top}px`;
          mask.style.left = `${rect.left}px`;
          mask.style.zIndex = 'calc(infinity)';
          mask.style.display = 'block';
          mask.style.width = `${Math.ceil(rect.width)}px`;
          mask.style.height = `${Math.ceil(rect.height)}px`;
          mask.style.pointerEvents = 'none';
          mask.style.background = color!;
          document.body.appendChild(mask);
        });
      },
      [config.selector, config.color],
    );
  },

  postCapture: async (page) => {
    await page.evaluate(() => {
      document.querySelectorAll('x-storycap-mask').forEach((el) => {
        el.remove();
      });
    });
  },
});

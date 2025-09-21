import type { ScreenshotMaskConfig } from '@storycap-testrun/internal';
import type { BrowserScreenshotHook } from './types';

/**
 * Creates hook that overlays colored masks on elements matching the selector
 */
export const createMaskingHook = (
  config: ScreenshotMaskConfig,
): BrowserScreenshotHook => ({
  async preCapture(_) {
    const selector = config.selector;
    const color = config.color;

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

  postCapture: async (_) => {
    document.querySelectorAll('x-storycap-mask').forEach((el) => {
      el.remove();
    });
  },
});

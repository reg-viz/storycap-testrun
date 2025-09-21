import type { BrowserScreenshotHook } from './types';

const remove = async (selector: string) => {
  document.querySelectorAll(selector!).forEach((el) => {
    el.remove();
  });
};

/**
 * Creates hook that removes DOM elements matching the selector before screenshot capture
 */
export const createRemovalHook = (selector: string): BrowserScreenshotHook => ({
  async setup(_) {
    await remove(selector);
  },

  async preCapture(_) {
    await remove(selector);
  },
});

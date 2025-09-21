import type { Page } from 'playwright';
import type { NodeScreenshotHook } from './types';

const remove = async (page: Page, selector: string) => {
  await page.evaluate(
    ([selector]) => {
      document.querySelectorAll(selector!).forEach((el) => {
        el.remove();
      });
    },
    [selector],
  );
};

/**
 * Creates hook that removes DOM elements matching the selector before screenshot capture using Playwright
 */
export const createRemovalHook = (selector: string): NodeScreenshotHook => ({
  async setup(page) {
    await remove(page, selector);
  },

  async preCapture(page) {
    await remove(page, selector);
  },
});

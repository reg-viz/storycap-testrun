import type { Page } from 'playwright';
import type { ScreenshotHook } from '../hook';

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

export const createRemovalHook = (selector: string): ScreenshotHook => ({
  async setup(page) {
    await remove(page, selector);
  },

  async preCapture(page) {
    await remove(page, selector);
  },
});

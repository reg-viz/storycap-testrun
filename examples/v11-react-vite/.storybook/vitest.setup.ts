import { screenshot } from '@storycap-testrun/browser';
import { page } from 'vitest/browser';
import { afterEach, beforeEach } from 'vitest';

beforeEach(async () => {
  await page.viewport(1280, 720);
});

afterEach(async (context) => {
  await screenshot(page, context);
});

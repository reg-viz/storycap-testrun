import { screenshot } from '@storycap-testrun/browser';
import { afterEach, beforeEach } from 'vitest';
import { page } from 'vitest/browser';

beforeEach(async () => {
  await page.viewport(1280, 720);
});

afterEach(async (context) => {
  await screenshot(page, context);
});

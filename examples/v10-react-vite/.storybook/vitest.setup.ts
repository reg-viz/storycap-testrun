import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import { setProjectAnnotations } from '@storybook/react-vite';
import { screenshot } from '@storycap-testrun/browser';
import { page } from '@vitest/browser/context';
import { afterEach, beforeEach } from 'vitest';
import * as projectAnnotations from './preview';

// This is an important step to apply the right configuration when testing your stories.
// More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
setProjectAnnotations([a11yAddonAnnotations, projectAnnotations]);

beforeEach(async () => {
  await page.viewport(1280, 720);
});

afterEach(async (context) => {
  await screenshot(page, context);
});

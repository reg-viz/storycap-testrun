import preview from '../.storybook/preview';
import { TallContent } from './TallContent';

const meta = preview.meta({
  title: 'Example/TallContent',
  component: TallContent,
  parameters: {
    layout: 'fullscreen',
  },
});

/**
 * Default: fullPage true — captures both sections (height > viewport)
 */
export const FullPage = meta.story();

/**
 * fullPage: false — captures only the viewport area (1280x720)
 */
export const ViewportOnly = meta.story({
  parameters: {
    screenshot: {
      fullPage: false,
    },
  },
});

/**
 * Per-story viewport override — keeps the configured width and captures the
 * viewport area at 1000px height (vs the 720px default)
 */
export const ViewportOverride = meta.story({
  parameters: {
    screenshot: {
      fullPage: false,
      viewport: { height: 1000 },
    },
  },
});

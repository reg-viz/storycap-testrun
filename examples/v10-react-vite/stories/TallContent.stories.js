import { TallContent } from './TallContent';

export default {
  title: 'Example/TallContent',
  component: TallContent,
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Default: fullPage true — captures both sections (height > viewport)
 */
export const FullPage = {};

/**
 * fullPage: false — captures only the viewport area (1280x720)
 */
export const ViewportOnly = {
  parameters: {
    screenshot: {
      fullPage: false,
    },
  },
};

/**
 * Per-story viewport override — keeps the configured width and captures the
 * viewport area at 1000px height (vs the 720px default)
 */
export const ViewportOverride = {
  parameters: {
    screenshot: {
      fullPage: false,
      viewport: { height: 1000 },
    },
  },
};

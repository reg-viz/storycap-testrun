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

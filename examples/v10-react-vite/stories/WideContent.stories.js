import { WideAndTallContent, WideContent } from './WideContent';

export default {
  title: 'Example/WideContent',
  component: WideContent,
  parameters: { layout: 'fullscreen' },
};

/**
 * Wide: fullPage true — captures the full 1920px width (width > viewport)
 */
export const Wide = {};

/**
 * WideAndTall: fullPage true — captures 1920x1440 content by tiling both axes
 */
export const WideAndTall = {
  render: WideAndTallContent,
};

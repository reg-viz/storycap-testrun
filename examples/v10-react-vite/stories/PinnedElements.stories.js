import { PinnedElements } from './PinnedElements';

export default {
  title: 'Example/PinnedElements',
  component: PinnedElements,
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Sticky and fixed elements are pinned to the viewport, so a naive
 * scroll-and-stitch capture paints them into every chunk. Each one should
 * appear exactly once here, where an equally tall viewport would put it.
 */
export const FullPage = {};

/**
 * The same story without stitching, as the reference for where each pinned
 * element sits on screen.
 */
export const ViewportOnly = {
  parameters: {
    screenshot: {
      fullPage: false,
    },
  },
};

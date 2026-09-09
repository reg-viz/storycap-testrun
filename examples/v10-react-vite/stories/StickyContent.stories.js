import { FixedContent, StickyContent } from './StickyContent';

export default {
  title: 'Example/StickyContent',
  component: StickyContent,
  parameters: { layout: 'fullscreen' },
};

/**
 * Sticky header over 2400px of rows — must appear exactly once.
 */
export const Sticky = {};

/**
 * `position: fixed` badge over 2400px of rows — must appear exactly once.
 */
export const Fixed = {
  render: FixedContent,
};

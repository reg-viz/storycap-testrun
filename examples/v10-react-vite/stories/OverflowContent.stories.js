import { AbsoluteOverflowContent } from './OverflowContent';

export default {
  title: 'Example/OverflowContent',
  component: AbsoluteOverflowContent,
  parameters: { layout: 'fullscreen' },
};

/**
 * Content that overflows the document via `position: absolute` rather than by
 * flowing. `body.scrollHeight` sees it but the body *box* does not, so an
 * element screenshot of `body` would clip it.
 */
export const AbsoluteOverflow = {};

import {
  freezeViewportUnits,
  type UnfreezeViewportUnits,
} from './viewport-units';

/**
 * A width/height pair in CSS pixels
 */
export type Size = {
  width: number;
  height: number;
};

/**
 * The iframe the story renders in, together with the wrapper Vitest sizes and
 * scales it through.
 */
export type CaptureFrame = {
  frame: HTMLIFrameElement;
  wrapper: HTMLElement | null;
};

/**
 * Resolves the iframe the current tester runs in.
 *
 * Vitest serves the tester same-origin, so `window.frameElement` reaches the
 * orchestrator's iframe element directly and the resizing below needs no
 * round trip to Node.
 */
export const getCaptureFrame = (): CaptureFrame | null => {
  const frame = window.frameElement as HTMLIFrameElement | null;
  if (frame == null) {
    return null;
  }
  return { frame, wrapper: frame.parentElement };
};

/**
 * Measures the size the content occupies, including anything overflowing the
 * current viewport.
 */
export const measureContentSize = (document: Document): Size => ({
  width: Math.max(
    document.body.scrollWidth,
    document.documentElement.scrollWidth,
  ),
  height: Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
  ),
});

/**
 * Sizes the iframe box.
 *
 * The wrapper carries the `transform: scale()` Vitest applies to fit the
 * iframe on screen; leaving it in place would scale the capture down, so it is
 * reset alongside the size. The iframe itself is sized too, both because a
 * stylesheet rule stretches it to `100%` and so that this still works if a
 * future Vitest drops the wrapper.
 */
export const resizeCaptureFrame = (
  { frame, wrapper }: CaptureFrame,
  { width, height }: Size,
): void => {
  if (wrapper != null) {
    wrapper.style.cssText = `width: ${width}px; height: ${height}px; transform: none; transform-origin: left top;`;
  }
  frame.style.setProperty('width', `${width}px`, 'important');
  frame.style.setProperty('height', `${height}px`, 'important');
};

/**
 * Waits for the browser to lay out and paint the pending size change.
 */
export const waitForReflow = async (): Promise<void> => {
  void document.documentElement.offsetHeight;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};

/**
 * The outcome of fitting the frame to its content.
 *
 * `unfreeze` must be called once the capture is done. `truncated` names the
 * axes the content still overflows, which only happens when something outside
 * this module's reach keeps the layout tied to the viewport.
 */
export type FitResult = {
  unfreeze: UnfreezeViewportUnits;
  truncated: ('width' | 'height')[];
};

/**
 * Grows the iframe so its outer box matches the content it holds, which lets a
 * single Playwright element screenshot capture everything, with no scrolling,
 * tiling or stitching.
 *
 * Growing is only sound once the layout no longer depends on the box being
 * grown, so viewport-relative units are pinned first — see
 * `freezeViewportUnits`. That covers units written in CSS; a length computed
 * in JavaScript from `window.innerHeight`, or one in a stylesheet the tester
 * cannot read, still moves. So the grown box is verified against a fresh
 * measurement and any axis that moved is rolled back to the viewport, which
 * keeps the story rendering the way it does today at the cost of a capture
 * cropped to that axis.
 */
export const fitFrameToContent = async (
  captureFrame: CaptureFrame,
  viewport: Size,
): Promise<FitResult> => {
  const unfreeze = freezeViewportUnits(document, viewport);

  const content = measureContentSize(document);
  const grown = {
    width: Math.max(content.width, viewport.width),
    height: Math.max(content.height, viewport.height),
  };

  resizeCaptureFrame(captureFrame, grown);
  await waitForReflow();

  const verified = measureContentSize(document);
  const settled = {
    width: verified.width === grown.width ? grown.width : viewport.width,
    height: verified.height === grown.height ? grown.height : viewport.height,
  };

  if (settled.width !== grown.width || settled.height !== grown.height) {
    resizeCaptureFrame(captureFrame, settled);
    await waitForReflow();
  }

  const remaining = measureContentSize(document);
  const truncated: ('width' | 'height')[] = [];
  if (remaining.width > settled.width) {
    truncated.push('width');
  }
  if (remaining.height > settled.height) {
    truncated.push('height');
  }

  return { unfreeze, truncated };
};

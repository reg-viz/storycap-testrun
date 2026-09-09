import { describe, test, expect, afterEach } from 'vitest';
import {
  fitFrameToContent,
  getCaptureFrame,
  measureContentSize,
  resizeCaptureFrame,
  type CaptureFrame,
  type Size,
} from './viewport';

const VIEWPORT: Size = { width: 1280, height: 720 };

const createFrame = (): CaptureFrame => {
  const wrapper = document.createElement('div');
  const frame = document.createElement('iframe');
  wrapper.style.cssText =
    'width: 1280px; height: 720px; transform: scale(0.8); transform-origin: left top;';
  wrapper.appendChild(frame);
  document.body.appendChild(wrapper);
  return { frame, wrapper };
};

const boxOf = ({ frame }: CaptureFrame): Size => ({
  width: Number.parseFloat(frame.style.width),
  height: Number.parseFloat(frame.style.height),
});

/**
 * Makes the document report a content size derived from the current iframe
 * box, which is what lets these tests reproduce viewport-relative units.
 */
const stubContent = (
  captureFrame: CaptureFrame,
  content: (box: Size) => Size,
) => {
  const read = () => content(boxOf(captureFrame));
  for (const node of [document.body, document.documentElement]) {
    Object.defineProperty(node, 'scrollWidth', {
      get: () => read().width,
      configurable: true,
    });
    Object.defineProperty(node, 'scrollHeight', {
      get: () => read().height,
      configurable: true,
    });
  }
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('measureContentSize', () => {
  test('takes the larger of body and documentElement', () => {
    Object.defineProperty(document.body, 'scrollWidth', {
      get: () => 800,
      configurable: true,
    });
    Object.defineProperty(document.body, 'scrollHeight', {
      get: () => 1400,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'scrollWidth', {
      get: () => 1920,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      get: () => 900,
      configurable: true,
    });

    expect(measureContentSize(document)).toEqual({
      width: 1920,
      height: 1400,
    });
  });
});

describe('resizeCaptureFrame', () => {
  test('sizes both the wrapper and the iframe, and drops the Vitest scale', () => {
    const captureFrame = createFrame();

    resizeCaptureFrame(captureFrame, { width: 1920, height: 1440 });

    expect(captureFrame.wrapper!.style.width).toBe('1920px');
    expect(captureFrame.wrapper!.style.height).toBe('1440px');
    expect(captureFrame.wrapper!.style.transform).toBe('none');
    expect(captureFrame.frame.style.width).toBe('1920px');
    expect(captureFrame.frame.style.height).toBe('1440px');
  });

  test('sizes the iframe when there is no wrapper', () => {
    const frame = document.createElement('iframe');

    resizeCaptureFrame({ frame, wrapper: null }, { width: 640, height: 480 });

    expect(frame.style.width).toBe('640px');
    expect(frame.style.height).toBe('480px');
  });
});

describe('getCaptureFrame', () => {
  test('returns null when not running inside an iframe', () => {
    expect(getCaptureFrame()).toBeNull();
  });

  test('pairs the frame with its wrapper', () => {
    const { frame, wrapper } = createFrame();
    Object.defineProperty(window, 'frameElement', {
      get: () => frame,
      configurable: true,
    });

    try {
      expect(getCaptureFrame()).toEqual({ frame, wrapper });
    } finally {
      Object.defineProperty(window, 'frameElement', {
        get: () => null,
        configurable: true,
      });
    }
  });
});

describe('fitFrameToContent', () => {
  test('grows both axes for content with a fixed size', async () => {
    const captureFrame = createFrame();
    stubContent(captureFrame, () => ({ width: 1920, height: 1440 }));

    const { truncated } = await fitFrameToContent(captureFrame, VIEWPORT);

    expect(truncated).toEqual([]);
    expect(boxOf(captureFrame)).toEqual({ width: 1920, height: 1440 });
  });

  test('grows the width alone when only the width overflows', async () => {
    const captureFrame = createFrame();
    stubContent(captureFrame, () => ({ width: 1920, height: 300 }));

    const { truncated } = await fitFrameToContent(captureFrame, VIEWPORT);

    expect(truncated).toEqual([]);
    // Never shrinks below the viewport, matching Playwright's own `fullPage`.
    expect(boxOf(captureFrame)).toEqual({ width: 1920, height: 720 });
  });

  test('keeps the viewport box when the content fits', async () => {
    const captureFrame = createFrame();
    stubContent(captureFrame, () => ({ width: 1000, height: 400 }));

    const { truncated } = await fitFrameToContent(captureFrame, VIEWPORT);

    expect(truncated).toEqual([]);
    expect(boxOf(captureFrame)).toEqual(VIEWPORT);
  });

  test('rolls back a height that keeps following the frame', async () => {
    const captureFrame = createFrame();
    // Stands in for a height JavaScript recomputes from window.innerHeight,
    // which freezing the CSS units cannot reach.
    stubContent(captureFrame, (box) => ({
      width: box.width,
      height: box.height * 2,
    }));

    const { truncated } = await fitFrameToContent(captureFrame, VIEWPORT);

    expect(truncated).toEqual(['height']);
    expect(boxOf(captureFrame)).toEqual(VIEWPORT);
  });

  test('keeps a grown width while rolling back an unstable height', async () => {
    const captureFrame = createFrame();
    stubContent(captureFrame, (box) => ({
      width: 1920,
      height: box.height * 2,
    }));

    const { truncated } = await fitFrameToContent(captureFrame, VIEWPORT);

    expect(truncated).toEqual(['height']);
    expect(boxOf(captureFrame)).toEqual({ width: 1920, height: 720 });
  });

  test('rolls back an unstable width and keeps a stable height', async () => {
    const captureFrame = createFrame();
    stubContent(captureFrame, (box) => ({
      width: box.width * 1.5,
      height: 1440,
    }));

    const { truncated } = await fitFrameToContent(captureFrame, VIEWPORT);

    expect(truncated).toEqual(['width']);
    expect(boxOf(captureFrame)).toEqual({ width: 1280, height: 1440 });
  });

  test('freezes viewport units so `100vh` content can be grown into', async () => {
    const captureFrame = createFrame();
    const style = document.createElement('style');
    style.textContent = '.section { height: 100vh }';
    document.head.appendChild(style);

    // Reproduces the real feedback loop: two 100vh sections, where the
    // content height tracks whatever the CSS currently resolves to.
    const sectionHeight = () => {
      const rule = (style.sheet!.cssRules[0] as CSSStyleRule).style;
      const value = rule.getPropertyValue('height');
      return value.endsWith('vh')
        ? (Number.parseFloat(value) / 100) * boxOf(captureFrame).height
        : Number.parseFloat(value);
    };
    stubContent(captureFrame, () => ({
      width: 1280,
      height: sectionHeight() * 2,
    }));

    try {
      const { truncated, unfreeze } = await fitFrameToContent(
        captureFrame,
        VIEWPORT,
      );

      expect(truncated).toEqual([]);
      expect(boxOf(captureFrame)).toEqual({ width: 1280, height: 1440 });

      unfreeze();
      expect(
        (style.sheet!.cssRules[0] as CSSStyleRule).style.getPropertyValue(
          'height',
        ),
      ).toBe('100vh');
    } finally {
      style.remove();
    }
  });
});

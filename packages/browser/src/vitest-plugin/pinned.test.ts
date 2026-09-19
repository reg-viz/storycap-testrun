import { describe, test, expect } from 'vitest';
import {
  computeChunkInsets,
  computeTargetRect,
  type PinnedFact,
} from './pinned';

const VIEWPORT = { width: 1280, height: 720 };
// Two full chunks plus a 40px remainder, so the last chunk is far shorter than
// a 100px bar pinned to the bottom.
const SCROLL_SIZE = { width: 1280, height: 1480 };

type FactInput = {
  top: number;
  height: number;
  left?: number;
  width?: number;
  anchor?: 'top' | 'bottom';
  hAnchor?: 'left' | 'right';
  auto?: boolean;
};

/**
 * Builds the facts the browser side reports for a fixed element, deriving the
 * used insets the way the browser resolves them: both are pixel values, only
 * the computed ones say which edge the element is anchored to.
 */
const fact = ({
  top,
  height,
  left = 0,
  width = VIEWPORT.width,
  anchor = 'top',
  hAnchor = 'left',
  auto = true,
}: FactInput): PinnedFact => {
  const rect = { top, bottom: top + height, left, right: left + width };
  return {
    index: 0,
    rect,
    used: {
      top: rect.top,
      bottom: VIEWPORT.height - rect.bottom,
      left: rect.left,
      right: VIEWPORT.width - rect.right,
    },
    auto: auto
      ? {
          top: anchor === 'bottom',
          bottom: anchor === 'top',
          left: hAnchor === 'right',
          right: hAnchor === 'left',
        }
      : null,
  };
};

/** Viewport coordinates of the element's box on the chunk reached at `y`. */
const placeAt = (input: FactInput, y: number) => {
  const f = fact(input);
  const target = computeTargetRect(f, SCROLL_SIZE, VIEWPORT);
  const insets = computeChunkInsets(f, target, { x: 0, y });
  const height = f.rect.bottom - f.rect.top;
  return {
    top: insets.top,
    bottom:
      insets.bottom == null
        ? insets.top + height
        : VIEWPORT.height - insets.bottom,
  };
};

describe('computeTargetRect', () => {
  test('places a top-anchored bar at its viewport offset from the document top', () => {
    const target = computeTargetRect(
      fact({ top: 0, height: 72 }),
      SCROLL_SIZE,
      VIEWPORT,
    );
    expect(target).toMatchObject({ top: 0, bottom: 72, stretchY: false });
  });

  test('places a bottom-anchored bar at its viewport offset from the document bottom', () => {
    const target = computeTargetRect(
      fact({ top: 620, height: 100, anchor: 'bottom' }),
      SCROLL_SIZE,
      VIEWPORT,
    );
    expect(target).toMatchObject({ top: 1380, bottom: 1480, stretchY: false });
  });

  test('stretches an element covering the viewport across the whole document', () => {
    const target = computeTargetRect(
      fact({ top: 0, height: VIEWPORT.height }),
      SCROLL_SIZE,
      VIEWPORT,
    );
    expect(target).toMatchObject({ top: 0, bottom: 1480, stretchY: true });
  });

  test('keeps a mid-viewport element at its own offset rather than snapping to an edge', () => {
    // A floating action button at `top: 60%` is nearer the bottom edge, which
    // is what the old `rect.top < innerHeight / 2` split got wrong.
    const target = computeTargetRect(
      fact({ top: 432, height: 40 }),
      SCROLL_SIZE,
      VIEWPORT,
    );
    expect(target).toMatchObject({ top: 432, bottom: 472 });
  });

  test('anchors by the nearer edge when Typed OM is unavailable', () => {
    const target = computeTargetRect(
      fact({ top: 620, height: 100, auto: false }),
      SCROLL_SIZE,
      VIEWPORT,
    );
    expect(target).toMatchObject({ top: 1380, bottom: 1480 });
  });

  test('anchors horizontally the same way', () => {
    const target = computeTargetRect(
      fact({
        top: 0,
        height: 56,
        left: 1180,
        width: 56,
        hAnchor: 'right',
      }),
      { width: 2560, height: 1480 },
      VIEWPORT,
    );
    expect(target).toMatchObject({ left: 2460, right: 2516, stretchX: false });
  });
});

describe('computeChunkInsets', () => {
  test('holds a top-anchored bar in the first chunk only', () => {
    const header = { top: 0, height: 72 } as const;
    expect(placeAt(header, 0)).toEqual({ top: 0, bottom: 72 });
    // Above the viewport on the second chunk, so it is not painted again.
    expect(placeAt(header, 720)).toEqual({ top: -720, bottom: -648 });
  });

  test('splits a bottom-anchored bar across the last two chunks', () => {
    // The final chunk is only 40px tall, so a 100px footer cannot fit in it;
    // the remaining 60px have to come from the chunk before.
    const footer = { top: 620, height: 100, anchor: 'bottom' } as const;
    expect(placeAt(footer, 0)).toEqual({ top: 1380, bottom: 1480 });
    expect(placeAt(footer, 720)).toEqual({ top: 660, bottom: 760 });
    expect(placeAt(footer, 760)).toEqual({ top: 620, bottom: 720 });
  });

  test('covers every chunk with a full-viewport overlay', () => {
    const overlay = { top: 0, height: VIEWPORT.height } as const;
    for (const [reached, top] of [
      [0, 0],
      [720, -720],
      [760, -760],
    ] as const) {
      const box = placeAt(overlay, reached);
      expect(box.top).toBe(top);
      expect(box.bottom).toBe(top + SCROLL_SIZE.height);
      // The whole viewport is inside the overlay on every chunk.
      expect(box.top).toBeLessThanOrEqual(0);
      expect(box.bottom).toBeGreaterThanOrEqual(VIEWPORT.height);
    }
  });

  test('keeps `auto` on an axis the element does not span', () => {
    const f = fact({ top: 0, height: 72, left: 16, width: 56 });
    const target = computeTargetRect(f, SCROLL_SIZE, VIEWPORT);
    expect(computeChunkInsets(f, target, { x: 0, y: 0 })).toMatchObject({
      bottom: null,
      right: null,
    });
  });

  test('stretches a full-width bar across a horizontally stitched document', () => {
    const wide = { width: 2560, height: 1480 };
    const f = fact({ top: 0, height: 72 });
    const target = computeTargetRect(f, wide, VIEWPORT);
    expect(target).toMatchObject({ left: 0, right: 2560, stretchX: true });
    // Second column: the bar reaches back over the column already captured.
    expect(computeChunkInsets(f, target, { x: 1280, y: 0 })).toMatchObject({
      left: -1280,
      right: 0,
    });
  });

  test('offsets a margined element by the same delta as its used inset', () => {
    // `top: 10px` with `margin-top: 20px` puts the border box at 30px; the
    // element still has to end up 30px into the document.
    const f: PinnedFact = {
      index: 0,
      rect: { top: 30, bottom: 100, left: 0, right: 1280 },
      used: { top: 10, bottom: 620, left: 0, right: 0 },
      auto: { top: false, bottom: true, left: false, right: true },
    };
    const target = computeTargetRect(f, SCROLL_SIZE, VIEWPORT);
    expect(target.top).toBe(30);
    // Border box back at 30 - 720 = -690, which the used inset 10 - 720 gives.
    expect(computeChunkInsets(f, target, { x: 0, y: 720 }).top).toBe(-710);
  });
});

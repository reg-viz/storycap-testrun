import type { BrowserCommandContext } from 'vitest/node';

type Frame = BrowserCommandContext['iframe'];

export type Size = { width: number; height: number };
export type Offset = { x: number; y: number };
export type Edges = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/**
 * Geometry of a single viewport-pinned (`position: fixed`) element, measured in
 * the story at scroll offset 0.
 */
export type PinnedFact = {
  /** Position in the browser-side element list, used to address it per chunk. */
  index: number;
  /** Border-box rect in viewport coordinates. */
  rect: Edges;
  /** Used inset values in px, as the browser resolved them. */
  used: Edges;
  /**
   * Whether each *computed* inset is `auto`, which is what says the element is
   * anchored to the bottom/right rather than the top/left. Only CSS Typed OM
   * reports this: `getComputedStyle` resolves an omitted inset to its used
   * static position, so a `bottom: 0` footer reads back a pixel `top` there.
   * `null` when Typed OM is unavailable and the anchor has to be guessed.
   */
  auto: { top: boolean; bottom: boolean; left: boolean; right: boolean } | null;
};

/** Where a pinned element belongs in the stitched image, in document coordinates. */
export type TargetRect = Edges & {
  /** The element covers the viewport on that axis, so it spans the document. */
  stretchY: boolean;
  stretchX: boolean;
};

/** Inline insets to apply for one chunk. `null` means `auto`. */
export type ChunkInsets = {
  index: number;
  top: number;
  bottom: number | null;
  left: number;
  right: number | null;
};

export type PinnedSetup = {
  facts: PinnedFact[];
  targets: TargetRect[];
};

// Sub-pixel layout means an overlay pinned to both edges can read back a
// fraction short of the viewport box.
const SPAN_EPSILON = 0.5;

/**
 * An element is anchored to the trailing edge when that inset is set and the
 * leading one is not. Without Typed OM the anchor is unknown, so the nearer
 * viewport edge is assumed — no worse than treating everything as
 * leading-anchored, which is what duplicated bottom bars in the first place.
 */
const isTrailingAnchored = (
  trailingAuto: boolean | undefined,
  leadingAuto: boolean | undefined,
  distanceToTrailing: number,
  distanceToLeading: number,
): boolean =>
  trailingAuto == null || leadingAuto == null
    ? distanceToTrailing < distanceToLeading
    : !trailingAuto && leadingAuto;

/**
 * Resolves where a pinned element should sit in the stitched image.
 *
 * Placement follows the capture viewport: the element keeps the offset it has
 * from the viewport edge it is anchored to, and that offset is re-applied
 * against the matching document edge. An element that covers the whole viewport
 * is the exception — it stretches across the whole document, which is what an
 * `inset: 0` overlay is expected to do.
 */
export const computeTargetRect = (
  fact: PinnedFact,
  scrollSize: Size,
  viewport: Size,
): TargetRect => {
  const { rect } = fact;
  const height = rect.bottom - rect.top;
  const width = rect.right - rect.left;

  const stretchY =
    rect.top <= SPAN_EPSILON && rect.bottom >= viewport.height - SPAN_EPSILON;
  const stretchX =
    rect.left <= SPAN_EPSILON && rect.right >= viewport.width - SPAN_EPSILON;

  // Distance from the viewport's trailing edge, re-anchored to the document's.
  const fromBottom = scrollSize.height - (viewport.height - rect.bottom);
  const fromRight = scrollSize.width - (viewport.width - rect.right);

  const bottomAnchored = isTrailingAnchored(
    fact.auto?.bottom,
    fact.auto?.top,
    viewport.height - rect.bottom,
    rect.top,
  );
  const rightAnchored = isTrailingAnchored(
    fact.auto?.right,
    fact.auto?.left,
    viewport.width - rect.right,
    rect.left,
  );

  let top: number;
  let bottom: number;
  if (stretchY) {
    top = rect.top;
    bottom = fromBottom;
  } else if (bottomAnchored) {
    bottom = fromBottom;
    top = bottom - height;
  } else {
    top = rect.top;
    bottom = top + height;
  }

  let left: number;
  let right: number;
  if (stretchX) {
    left = rect.left;
    right = fromRight;
  } else if (rightAnchored) {
    right = fromRight;
    left = right - width;
  } else {
    left = rect.left;
    right = left + width;
  }

  return { top, bottom, left, right, stretchY, stretchX };
};

/**
 * Translates a target rect into inline insets for one chunk.
 *
 * The element stays `position: fixed`, so it is placed relative to the viewport
 * at the offset the page actually reached. Working in deltas from the used
 * inset — rather than assigning the target coordinate outright — keeps margins
 * and `box-sizing` out of the arithmetic.
 *
 * An element that overlaps only part of a chunk is positioned across the clip
 * boundary and each chunk paints its own slice, so stitching puts it back
 * together. That is what keeps a bottom-anchored bar intact when the last chunk
 * is shorter than the bar itself.
 */
export const computeChunkInsets = (
  fact: PinnedFact,
  target: TargetRect,
  reached: Offset,
): ChunkInsets => ({
  index: fact.index,
  top: fact.used.top + (target.top - reached.y - fact.rect.top),
  bottom: target.stretchY
    ? fact.used.bottom - (target.bottom - reached.y - fact.rect.bottom)
    : null,
  left: fact.used.left + (target.left - reached.x - fact.rect.left),
  right: target.stretchX
    ? fact.used.right - (target.right - reached.x - fact.rect.right)
    : null,
});

/**
 * Neutralizes sticky elements and measures the fixed ones.
 *
 * Sticky elements are taken out of their stuck state rather than hidden:
 * `position: relative` with no insets leaves the box in flow where it sits at
 * scroll 0, which is what a viewport tall enough to hold the whole story would
 * render, and it then tiles across chunks like any other content. Only elements
 * whose scroll port is the document are touched, so a sticky table header
 * inside its own scroll container keeps behaving normally.
 *
 * Fixed elements are probed by scrolling: one whose rect does not move with the
 * viewport — `position: fixed` under a `transform`, `filter` or `contain: paint`
 * ancestor — is not duplicated by stitching, so it is left alone.
 */
export const setupPinnedElements = async (
  frame: Frame,
  viewport: Size,
  scrollSize: Size,
): Promise<PinnedSetup> => {
  const facts = await frame.locator('body').evaluate(
    (body, { vw, vh, sw, sh }): PinnedFact[] => {
      const doc = body.ownerDocument;
      const view = doc.defaultView;
      if (view == null) return [];

      // `clip` and `visible` do not create a scroll port; `hidden` does, since
      // it is still programmatically scrollable.
      const scrollable = ['auto', 'scroll', 'hidden', 'overlay'];
      const hasOwnScrollPort = (el: Element): boolean => {
        for (let p = el.parentElement; p != null; p = p.parentElement) {
          if (p === doc.body || p === doc.documentElement) break;
          const style = view.getComputedStyle(p);
          if (
            scrollable.includes(style.overflowX) ||
            scrollable.includes(style.overflowY)
          ) {
            return true;
          }
        }
        return false;
      };

      const sticky: HTMLElement[] = [];
      const fixed: HTMLElement[] = [];
      for (const el of Array.from(doc.querySelectorAll<HTMLElement>('*'))) {
        const position = view.getComputedStyle(el).position;
        if (position === 'sticky') {
          if (!hasOwnScrollPort(el)) sticky.push(el);
        } else if (position === 'fixed') {
          fixed.push(el);
        }
      }
      if (sticky.length === 0 && fixed.length === 0) return [];

      // The whole `style` attribute is snapshotted so restoring cannot leak a
      // property this pass sets, and cannot resurrect an element the story
      // itself had hidden.
      const candidates = [...sticky, ...fixed];
      const styles = candidates.map((el) => el.getAttribute('style'));

      for (const el of sticky) {
        el.style.setProperty('position', 'relative', 'important');
        el.style.setProperty('inset', 'auto', 'important');
      }

      view.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      const base = fixed.map((el) => el.getBoundingClientRect());
      view.scrollTo({
        top: Math.max(0, Math.min(vh, sh - vh)),
        left: Math.max(0, Math.min(vw, sw - vw)),
        behavior: 'instant',
      });
      const probe = { x: view.scrollX, y: view.scrollY };
      const probed = fixed.map((el) => el.getBoundingClientRect());
      view.scrollTo({ top: 0, left: 0, behavior: 'instant' });

      const pinned: HTMLElement[] = [];
      const collected: PinnedFact[] = [];
      fixed.forEach((el, i) => {
        const rect = base[i]!;
        const after = probed[i]!;
        // Neither axis could be probed, so nothing can duplicate either.
        const movesWithViewport =
          probe.y > 0
            ? Math.abs(after.top - rect.top) < 0.5
            : probe.x > 0
              ? Math.abs(after.left - rect.left) < 0.5
              : true;
        if (!movesWithViewport) return;

        const style = view.getComputedStyle(el);
        const inset = (value: string, fallback: number): number => {
          const parsed = Number.parseFloat(value);
          return Number.isFinite(parsed) ? parsed : fallback;
        };
        const map =
          typeof el.computedStyleMap === 'function'
            ? el.computedStyleMap()
            : null;
        const isAuto = (property: string): boolean =>
          map?.get(property)?.toString() === 'auto';

        collected.push({
          index: pinned.length,
          rect: {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
          },
          used: {
            top: inset(style.top, rect.top),
            bottom: inset(style.bottom, vh - rect.bottom),
            left: inset(style.left, rect.left),
            right: inset(style.right, vw - rect.right),
          },
          auto:
            map == null
              ? null
              : {
                  top: isAuto('top'),
                  bottom: isAuto('bottom'),
                  left: isAuto('left'),
                  right: isAuto('right'),
                },
        });
        pinned.push(el);
      });

      (view as unknown as { __storycapPinned?: unknown }).__storycapPinned = {
        candidates,
        styles,
        pinned,
      };
      return collected;
    },
    {
      vw: viewport.width,
      vh: viewport.height,
      sw: scrollSize.width,
      sh: scrollSize.height,
    },
  );

  return {
    facts,
    targets: facts.map((fact) => computeTargetRect(fact, scrollSize, viewport)),
  };
};

/** Places every pinned element for the chunk the page is currently scrolled to. */
export const applyPinnedInsets = async (
  frame: Frame,
  insets: ChunkInsets[],
): Promise<void> => {
  if (insets.length === 0) return;
  await frame.locator('body').evaluate((body, applied: ChunkInsets[]) => {
    const state = (
      body.ownerDocument.defaultView as unknown as {
        __storycapPinned?: { pinned: HTMLElement[] };
      } | null
    )?.__storycapPinned;
    if (state == null) return;

    const px = (value: number | null): string =>
      value == null ? 'auto' : `${value}px`;
    for (const it of applied) {
      const el = state.pinned[it.index];
      if (el == null) continue;
      // `important` so an author rule that also uses it cannot win back the
      // original placement; the used values this is derived from already
      // account for that rule.
      el.style.setProperty('top', px(it.top), 'important');
      el.style.setProperty('bottom', px(it.bottom), 'important');
      el.style.setProperty('left', px(it.left), 'important');
      el.style.setProperty('right', px(it.right), 'important');
    }
  }, insets);
};

/** Puts every touched element's `style` attribute back exactly as it was. */
export const restorePinnedElements = async (frame: Frame): Promise<void> => {
  await frame.locator('body').evaluate((body) => {
    const view = body.ownerDocument.defaultView as unknown as {
      __storycapPinned?: {
        candidates: HTMLElement[];
        styles: (string | null)[];
      };
    } | null;
    const state = view?.__storycapPinned;
    if (view == null || state == null) return;

    state.candidates.forEach((el, i) => {
      const style = state.styles[i];
      if (style == null) {
        el.removeAttribute('style');
      } else {
        el.setAttribute('style', style);
      }
    });
    delete view.__storycapPinned;
  });
};

import type { Size } from './viewport';

/**
 * A single declaration changed by a freeze, kept so it can be put back.
 */
type FrozenDeclaration = [
  style: CSSStyleDeclaration,
  property: string,
  value: string,
  priority: string,
];

/**
 * Undoes a freeze
 */
export type UnfreezeViewportUnits = () => void;

// Matched against declaration values. The lookbehind keeps the match from
// starting midway through an identifier, so `url(logo100vh.png)` is left
// alone while `calc(100% - 10vh)` is not.
const VIEWPORT_UNIT =
  /(?<![\w.-])(-?(?:\d+\.?\d*|\.\d+))(dvh|svh|lvh|dvw|svw|lvw|vmin|vmax|vh|vw)\b/gi;

const basisOf = (unit: string, { width, height }: Size): number => {
  switch (unit.toLowerCase()) {
    case 'vh':
    case 'dvh':
    case 'svh':
    case 'lvh':
      return height;
    case 'vw':
    case 'dvw':
    case 'svw':
    case 'lvw':
      return width;
    case 'vmin':
      return Math.min(width, height);
    default:
      return Math.max(width, height);
  }
};

/**
 * Rewrites the viewport-relative lengths in a value as the pixel lengths they
 * currently resolve to.
 */
export const freezeValue = (value: string, viewport: Size): string =>
  value.replace(
    VIEWPORT_UNIT,
    (_, amount: string, unit: string) =>
      `${(Number.parseFloat(amount) * basisOf(unit, viewport)) / 100}px`,
  );

const freezeDeclaration = (
  style: CSSStyleDeclaration,
  viewport: Size,
  frozen: FrozenDeclaration[],
): void => {
  // Indexed iteration reaches custom properties too, which is where a
  // framework often stashes a viewport-derived length.
  for (let i = 0; i < style.length; i++) {
    const property = style[i];
    if (property == null) {
      continue;
    }
    const value = style.getPropertyValue(property);
    VIEWPORT_UNIT.lastIndex = 0;
    if (!VIEWPORT_UNIT.test(value)) {
      continue;
    }
    const priority = style.getPropertyPriority(property);
    frozen.push([style, property, value, priority]);
    style.setProperty(property, freezeValue(value, viewport), priority);
  }
};

const freezeRules = (
  rules: CSSRuleList,
  viewport: Size,
  frozen: FrozenDeclaration[],
): void => {
  for (const rule of Array.from(rules)) {
    const style = (rule as CSSStyleRule).style;
    if (style != null) {
      freezeDeclaration(style, viewport, frozen);
    }
    // Covers the grouping rules — @media, @supports, @container, @layer and
    // keyframes all nest the declarations that matter.
    const nested = (rule as CSSGroupingRule).cssRules;
    if (nested != null) {
      freezeRules(nested, viewport, frozen);
    }
  }
};

/**
 * Collects the document plus every open shadow root beneath it, since each
 * carries its own stylesheets.
 */
const collectRoots = (document: Document): (Document | ShadowRoot)[] => {
  const roots: (Document | ShadowRoot)[] = [document];
  for (let i = 0; i < roots.length; i++) {
    for (const element of Array.from(roots[i]!.querySelectorAll('*'))) {
      if (element.shadowRoot != null) {
        roots.push(element.shadowRoot);
      }
    }
  }
  return roots;
};

/**
 * Pins every viewport-relative length to the pixel length it currently
 * resolves to, and returns a function that puts them all back.
 *
 * Capturing a full page means growing the iframe to the height of its
 * content, but `100vh` resolves against that same iframe, so the content
 * grows with it and the measurement is never reached. Rewriting the units
 * first breaks that dependency: the values written back are the ones the
 * browser already computed, so the page renders identically, and growing the
 * frame afterwards no longer moves the layout.
 *
 * Stylesheets the tester cannot read, and units applied from JavaScript
 * rather than CSS, are out of reach here — `fitFrameToContent` re-measures
 * afterwards rather than assuming this worked.
 */
export const freezeViewportUnits = (
  document: Document,
  viewport: Size,
): UnfreezeViewportUnits => {
  const frozen: FrozenDeclaration[] = [];

  for (const root of collectRoots(document)) {
    const sheets = [
      ...Array.from(root.styleSheets ?? []),
      ...Array.from(root.adoptedStyleSheets ?? []),
    ];
    for (const sheet of sheets) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        // A cross-origin stylesheet throws rather than exposing its rules.
        continue;
      }
      freezeRules(rules, viewport, frozen);
    }
    for (const element of Array.from(root.querySelectorAll('[style]'))) {
      freezeDeclaration((element as HTMLElement).style, viewport, frozen);
    }
  }

  return () => {
    // Reversed so a property written twice ends up with its original value.
    for (const [style, property, value, priority] of frozen.reverse()) {
      style.setProperty(property, value, priority);
    }
    frozen.length = 0;
  };
};

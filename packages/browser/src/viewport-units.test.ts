import { describe, test, expect, afterEach } from 'vitest';
import { freezeValue, freezeViewportUnits } from './viewport-units';

const VIEWPORT = { width: 1280, height: 720 };

const addStyle = (css: string) => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  return style;
};

const ruleOf = (style: HTMLStyleElement, index = 0) =>
  (style.sheet!.cssRules[index] as CSSStyleRule).style;

afterEach(() => {
  document.head.querySelectorAll('style').forEach((el) => el.remove());
  document.body.innerHTML = '';
});

describe('freezeValue', () => {
  test.each([
    ['100vh', '720px'],
    ['50vw', '640px'],
    ['100vmin', '720px'],
    ['100vmax', '1280px'],
    ['100dvh', '720px'],
    ['100svh', '720px'],
    ['100lvh', '720px'],
    ['-10vh', '-72px'],
    ['12.5vh', '90px'],
    ['.5vh', '3.6px'],
    ['calc(100% - 10vh)', 'calc(100% - 72px)'],
    ['10vh 5vw', '72px 64px'],
  ])('rewrites %s as %s', (input, expected) => {
    expect(freezeValue(input, VIEWPORT)).toBe(expected);
  });

  test.each([
    ['10px'],
    ['1fr'],
    ['url(logo100vh.png)'],
    ['var(--x)'],
    ['revert'],
  ])('leaves %s alone', (input) => {
    expect(freezeValue(input, VIEWPORT)).toBe(input);
  });
});

describe('freezeViewportUnits', () => {
  test('rewrites a stylesheet rule and restores it', () => {
    const style = addStyle('.a { height: 100vh; color: red }');

    const unfreeze = freezeViewportUnits(document, VIEWPORT);
    expect(ruleOf(style).getPropertyValue('height')).toBe('720px');
    expect(ruleOf(style).getPropertyValue('color')).toBe('red');

    unfreeze();
    expect(ruleOf(style).getPropertyValue('height')).toBe('100vh');
  });

  test('rewrites inline styles and restores them', () => {
    const el = document.createElement('div');
    el.setAttribute('style', 'width: 50vw');
    document.body.appendChild(el);

    const unfreeze = freezeViewportUnits(document, VIEWPORT);
    expect(el.style.getPropertyValue('width')).toBe('640px');

    unfreeze();
    expect(el.style.getPropertyValue('width')).toBe('50vw');
  });

  test('rewrites custom properties, which is where frameworks stash lengths', () => {
    const style = addStyle(':root { --app-height: 100vh }');

    const unfreeze = freezeViewportUnits(document, VIEWPORT);
    expect(ruleOf(style).getPropertyValue('--app-height').trim()).toBe('720px');

    unfreeze();
    expect(ruleOf(style).getPropertyValue('--app-height').trim()).toBe('100vh');
  });

  test('reaches into grouping rules such as @media', () => {
    const style = addStyle('@media screen { .a { height: 100vh } }');
    const media = style.sheet!.cssRules[0] as CSSMediaRule;

    const unfreeze = freezeViewportUnits(document, VIEWPORT);
    expect(
      (media.cssRules[0] as CSSStyleRule).style.getPropertyValue('height'),
    ).toBe('720px');

    unfreeze();
    expect(
      (media.cssRules[0] as CSSStyleRule).style.getPropertyValue('height'),
    ).toBe('100vh');
  });

  test('preserves !important', () => {
    const style = addStyle('.a { height: 100vh !important }');

    const unfreeze = freezeViewportUnits(document, VIEWPORT);
    expect(ruleOf(style).getPropertyPriority('height')).toBe('important');
    expect(ruleOf(style).getPropertyValue('height')).toBe('720px');

    unfreeze();
    expect(ruleOf(style).getPropertyValue('height')).toBe('100vh');
    expect(ruleOf(style).getPropertyPriority('height')).toBe('important');
  });

  test('is a no-op for a document with no viewport units', () => {
    const style = addStyle('.a { height: 400px }');

    const unfreeze = freezeViewportUnits(document, VIEWPORT);
    expect(ruleOf(style).getPropertyValue('height')).toBe('400px');

    unfreeze();
    expect(ruleOf(style).getPropertyValue('height')).toBe('400px');
  });

  test('skips a stylesheet whose rules cannot be read', () => {
    const style = addStyle('.a { height: 100vh }');
    Object.defineProperty(style.sheet!, 'cssRules', {
      get() {
        throw new DOMException('cross-origin', 'SecurityError');
      },
      configurable: true,
    });

    expect(() => freezeViewportUnits(document, VIEWPORT)()).not.toThrow();
  });
});

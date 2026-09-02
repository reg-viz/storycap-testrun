import React from 'react';

const COLUMNS = [
  ['#e11', 'A 0-640'],
  ['#1a1', 'B 640-1280'],
  ['#11e', 'C 1280-1920'],
];

const cell = (bg, label, height) => (
  <div
    key={label}
    style={{
      width: 640,
      height,
      background: bg,
      color: '#fff',
      font: 'bold 48px serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
    }}
  >
    {label}
  </div>
);

/**
 * 1920px wide (3 columns x 640px), shorter than the viewport.
 * Exercises horizontal-only stitching.
 */
export const WideContent = () => (
  <div style={{ display: 'flex', width: 1920 }}>
    {COLUMNS.map(([bg, label]) => cell(bg, label, 300))}
  </div>
);

/**
 * 1920px wide and 1440px tall (3 columns x 2 rows).
 * Exercises stitching on both axes at once.
 */
export const WideAndTallContent = () => (
  <div style={{ width: 1920 }}>
    <div style={{ display: 'flex' }}>
      {COLUMNS.map(([bg, label]) => cell(bg, `1 ${label}`, 720))}
    </div>
    <div style={{ display: 'flex' }}>
      {COLUMNS.map(([bg, label]) => cell(bg, `2 ${label}`, 720))}
    </div>
  </div>
);

import React from 'react';

const rows = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * A sticky header over content taller than the viewport.
 * Stitched captures repeat the header once per tile; a single capture
 * should show it exactly once.
 */
export const StickyContent = () => (
  <div>
    <header
      style={{
        position: 'sticky',
        top: 0,
        height: 80,
        background: '#111',
        color: '#fff',
        font: 'bold 32px serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      Sticky header
    </header>
    {rows.map((n) => (
      <div
        key={n}
        style={{
          height: 200,
          background: n % 2 ? '#eee' : '#ccc',
          font: 'bold 32px serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Row {n}
      </div>
    ))}
  </div>
);

/**
 * A `position: fixed` badge over content taller than the viewport.
 */
export const FixedContent = () => (
  <div>
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        padding: '12px 24px',
        background: '#c00',
        color: '#fff',
        font: 'bold 24px serif',
        zIndex: 10,
      }}
    >
      Fixed badge
    </div>
    {rows.map((n) => (
      <div
        key={n}
        style={{
          height: 200,
          background: n % 2 ? '#eef' : '#cce',
          font: 'bold 32px serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Row {n}
      </div>
    ))}
  </div>
);

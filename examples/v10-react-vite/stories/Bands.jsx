import React from 'react';

const BANDS = [
  ['#e11', 'A 0-360'],
  ['#1a1', 'B 360-720'],
  ['#11e', 'C 720-1080'],
];

export const Bands = () => (
  <div style={{ margin: 0 }}>
    {BANDS.map(([bg, label]) => (
      <div
        key={label}
        style={{
          height: 360,
          background: bg,
          color: '#fff',
          font: 'bold 72px serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {label}
      </div>
    ))}
  </div>
);

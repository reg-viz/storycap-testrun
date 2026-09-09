import React from 'react';

export const AbsoluteOverflowContent = () => (
  <div>
    <div
      style={{
        height: 400,
        background: '#0aa',
        color: '#fff',
        font: 'bold 40px serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      In flow (0-400)
    </div>
    <div
      style={{
        position: 'absolute',
        top: 1600,
        left: 0,
        width: 800,
        height: 300,
        background: '#a0a',
        color: '#fff',
        font: 'bold 40px serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      Absolute at 1600
    </div>
  </div>
);

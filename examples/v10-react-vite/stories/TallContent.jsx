import React from 'react';

export const TallContent = () => (
  <div>
    <div
      style={{
        position: 'sticky',
        height: '72px',
        width: '100%',
        top: 0,
        background: '#faa',
      }}
    >
      <h1 style={{ margin: 0 }}>A Top 0 (sticky)</h1>
    </div>
    <section
      style={{
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h1 style={{ color: 'white', fontSize: '48px' }}>Section 1</h1>
    </section>
    <section
      style={{
        height: '100vh',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h1 style={{ color: 'white', fontSize: '48px' }}>Section 2</h1>
    </section>
    <div
      style={{
        position: 'sticky',
        height: '72px',
        width: '100%',
        bottom: 0,
        background: '#aff',
      }}
    >
      <h1 style={{ margin: 0 }}>Z Bottom 0 (sticky)</h1>
    </div>
  </div>
);

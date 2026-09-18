import React from 'react';

export const TallContent = () => (
  <div>
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
  </div>
);

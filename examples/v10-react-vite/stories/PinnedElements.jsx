import React from 'react';

const label = {
  margin: 0,
  font: '600 16px/1.6 system-ui, sans-serif',
  padding: '0 12px',
};

/**
 * Every shape of viewport-pinned element a stitched full-page capture has to
 * get right. The content is 1480px tall so that at a 720px viewport the last
 * chunk is only 40px — shorter than the 100px footer, which is the case where
 * a bottom-pinned element has to be split across two chunks.
 */
export const PinnedElements = () => (
  <div style={{ height: '1480px', background: '#fdfdfd' }}>
    {/* Stretched across the viewport, so it belongs on every chunk. */}
    <div
      style={{
        position: 'fixed',
        inset: 0,
        border: '4px dashed #d62828',
        background: 'rgba(214, 40, 40, 0.05)',
        pointerEvents: 'none',
      }}
    />

    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: '#1d3557',
        color: 'white',
      }}
    >
      <h1 style={label}>fixed top: 0 — expected once, at the very top</h1>
    </header>

    <footer
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100px',
        background: '#2a9d8f',
        color: 'white',
      }}
    >
      <h1 style={label}>
        fixed bottom: 0 — expected once, whole, at the very bottom
      </h1>
    </footer>

    {/* Anchored to neither edge: the old nearest-edge split dropped this one. */}
    <div
      style={{
        position: 'fixed',
        top: '60%',
        right: '24px',
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        background: '#e76f51',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        font: '600 12px/1.3 system-ui, sans-serif',
      }}
    >
      fixed top 60%
    </div>

    {/* Restoring the `style` attribute has to leave this hidden. */}
    <div
      style={{
        position: 'fixed',
        top: '64px',
        left: 0,
        right: 0,
        height: '40px',
        background: '#000',
        color: 'white',
        visibility: 'hidden',
      }}
    >
      <h1 style={label}>fixed + visibility: hidden — expected never</h1>
    </div>

    <section
      style={{ height: '800px', paddingTop: '80px', boxSizing: 'border-box' }}
    >
      <h2 style={{ ...label, paddingTop: '24px' }}>Band A — flow 0 to 800</h2>

      {/* Its scroll port is its own container, not the document, so it must
          keep sticking exactly as it does on screen. */}
      <div
        style={{
          margin: '16px 12px',
          width: '420px',
          height: '160px',
          overflow: 'auto',
          border: '2px solid #457b9d',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: '#457b9d',
            color: 'white',
          }}
        >
          <h3 style={label}>sticky in an inner scroll container</h3>
        </div>
        <div style={{ height: '600px', padding: '0 12px' }}>
          scrollable content
        </div>
      </div>

      {/* A transform makes this the containing block, so the child scrolls with
          the page and is not duplicated by stitching. */}
      <div style={{ transform: 'translateZ(0)', margin: '0 12px' }}>
        <div
          style={{
            position: 'fixed',
            top: '300px',
            left: '12px',
            width: '360px',
            height: '56px',
            background: '#f4a261',
          }}
        >
          <h3 style={label}>fixed under a transformed ancestor</h3>
        </div>
      </div>
    </section>

    {/* Sticks part-way down the page: not a header, not a footer. */}
    <section
      style={{
        height: '600px',
        boxSizing: 'border-box',
        background: '#e9f5f3',
        borderTop: '2px solid #2a9d8f',
      }}
    >
      <div style={{ position: 'sticky', top: 0, background: '#a8dadc' }}>
        <h2 style={label}>
          sticky mid-page — expected once, at flow position 800
        </h2>
      </div>
      <p style={{ ...label, fontWeight: 400 }}>Band B — flow 800 to 1400</p>
    </section>

    <div style={{ height: '80px', background: '#f1faee' }}>
      <p style={{ ...label, fontWeight: 400 }}>Band C — flow 1400 to 1480</p>
    </div>
  </div>
);

/**
 * ErrorBoundary.jsx
 * Wraps any section — catches runtime errors so one broken component
 * cannot blank the entire app. Accepts:
 *   sectionName  — shown in error title (e.g. "Portfolio Allocation")
 *   fallback     — custom JSX to show instead of the default error card
 */
import React from 'react';

const S = {
  wrap: {
    background: 'var(--bg2)', border: '1px solid rgba(232,64,64,.3)',
    borderRadius: 14, padding: '32px 24px', textAlign: 'center',
    margin: '16px auto', maxWidth: 520,
  },
  icon:  { fontSize: 40, marginBottom: 12, display: 'block' },
  title: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--red)', marginBottom: 8 },
  sub:   { fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20, maxWidth: 380, margin: '0 auto 20px' },
  row:   { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  btn:   { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 20px', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' },
  pre:   { marginTop: 16, background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--muted)', textAlign: 'left', maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error(`[ErrorBoundary${this.props.sectionName ? ': ' + this.props.sectionName : ''}]`, error, info);
  }

  reset = () => this.setState({ hasError: false, error: null, info: null, showDetails: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback)  return this.props.fallback;

    const { sectionName } = this.props;
    const { error, info, showDetails } = this.state;

    return (
      <div style={S.wrap}>
        <span style={S.icon}>⚠️</span>
        <div style={S.title}>
          {sectionName ? `${sectionName} failed to load` : 'Something went wrong'}
        </div>
        <div style={S.sub}>
          This section ran into an error. Your other data is unaffected.
          Try retrying or reloading the page.
        </div>
        <div style={S.row}>
          <button style={S.btn} onClick={this.reset}>↺ Retry</button>
          <button style={S.btn} onClick={() => window.location.reload()}>🔄 Reload</button>
          <button style={{ ...S.btn, fontSize: 11 }} onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}>
            {showDetails ? 'Hide' : 'Show'} details
          </button>
        </div>
        {showDetails && error && (
          <div style={S.pre}>
            {error.toString()}
            {'\n'}
            {info?.componentStack}
          </div>
        )}
      </div>
    );
  }
}

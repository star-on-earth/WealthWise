/**
 * Login.jsx
 * Sign in with Google or Email/Password.
 * Skippable — users can use the app as a guest (no data saved).
 */

import React, { useState } from 'react';
import {
  loginWithGoogle, loginWithEmail, registerWithEmail,
} from './firebase.js';

const S = {
  overlay: {
    minHeight: '100vh', background: 'var(--bg)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '24px 20px',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 },
  logoIcon: {
    width: 48, height: 48,
    background: 'linear-gradient(135deg,var(--gold),var(--emerald))',
    borderRadius: 12, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 24,
  },
  logoText: {
    fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800,
    background: 'linear-gradient(90deg,var(--gold),var(--gold2))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  card: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 400,
  },
  title: {
    fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800,
    color: 'var(--text)', marginBottom: 6, textAlign: 'center',
  },
  sub: { fontSize: 14, color: 'var(--muted)', textAlign: 'center', marginBottom: 28, lineHeight: 1.5 },
  googleBtn: {
    width: '100%', padding: '13px', borderRadius: 12,
    background: '#fff', color: '#1a1a1a', border: '1px solid #ddd',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: 18, fontFamily: 'var(--font-body)',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
    color: 'var(--muted)', fontSize: 12,
  },
  line: { flex: 1, height: 1, background: 'var(--border)' },
  label: { fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5, display: 'block' },
  input: {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', color: 'var(--text)',
    fontSize: 14, fontFamily: 'var(--font-body)', marginBottom: 12,
    transition: 'border-color .2s',
  },
  btn: {
    width: '100%', padding: '13px', borderRadius: 12,
    background: 'linear-gradient(135deg,var(--gold),#e09b0a)',
    color: '#000', border: 'none', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'var(--font-display)', marginBottom: 14,
  },
  toggle: { fontSize: 13, color: 'var(--muted)', textAlign: 'center', cursor: 'pointer' },
  toggleLink: { color: 'var(--gold)', fontWeight: 600 },
  skip: {
    marginTop: 20, fontSize: 13, color: 'var(--muted)',
    textAlign: 'center', cursor: 'pointer', textDecoration: 'underline',
    textUnderlineOffset: 3,
  },
  err: {
    background: 'rgba(255,87,87,.12)', border: '1px solid rgba(255,87,87,.3)',
    borderRadius: 8, padding: '10px 13px', fontSize: 13,
    color: 'var(--red)', marginBottom: 14, lineHeight: 1.5,
  },
};

export default function Login({ onSkip }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const focusGold = e => e.target.style.borderColor = 'var(--gold)';
  const blurReset = e => e.target.style.borderColor = 'var(--border)';

  const handleEmail = async () => {
    if (!email || !password) return;
    setLoading(true); setError('');
    try {
      if (isRegister) await registerWithEmail(email, password);
      else            await loginWithEmail(email, password);
    } catch (e) {
      const msgs = {
        'auth/user-not-found':     'No account found. Try signing up.',
        'auth/wrong-password':     'Wrong password.',
        'auth/email-already-in-use': 'Email already registered. Log in instead.',
        'auth/weak-password':      'Password must be at least 6 characters.',
        'auth/invalid-email':      'Invalid email address.',
        'auth/too-many-requests':  'Too many attempts. Try again later.',
      };
      setError(msgs[e.code] || e.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true); setError('');
    try { await loginWithGoogle(); }
    catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={S.overlay}>
      <div style={S.logoRow}>
        <div style={S.logoIcon}>₹</div>
        <span style={S.logoText}>WealthWise</span>
      </div>

      <div style={S.card}>
        <div style={S.title}>{isRegister ? 'Create Account' : 'Welcome Back'}</div>
        <div style={S.sub}>
          {isRegister
            ? 'Save your plans, track expenses, and set goals — all in one place.'
            : 'Sign in to access your saved plans and financial data.'}
        </div>

        {error && <div style={S.err}>{error}</div>}

        <button style={S.googleBtn} onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <div style={S.divider}>
          <div style={S.line} />or<div style={S.line} />
        </div>

        <label style={S.label}>Email</label>
        <input style={S.input} type="email" placeholder="you@example.com"
          value={email} onChange={e => setEmail(e.target.value)}
          onFocus={focusGold} onBlur={blurReset}
          onKeyDown={e => e.key === 'Enter' && handleEmail()} />

        <label style={S.label}>Password</label>
        <input style={S.input} type="password" placeholder="••••••••"
          value={password} onChange={e => setPassword(e.target.value)}
          onFocus={focusGold} onBlur={blurReset}
          onKeyDown={e => e.key === 'Enter' && handleEmail()} />

        <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }}
          onClick={handleEmail} disabled={loading}>
          {loading ? '…' : isRegister ? 'Create Account' : 'Sign In'}
        </button>

        <div style={S.toggle} onClick={() => { setIsRegister(r => !r); setError(''); }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span style={S.toggleLink}>{isRegister ? 'Sign In' : 'Sign Up'}</span>
        </div>
      </div>

      <div style={S.skip} onClick={onSkip}>
        Skip for now — continue as guest
      </div>
    </div>
  );
}

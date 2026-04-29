// src/Login.jsx
// ─────────────────────────────────────────────────────────────
// Login page for the TD Africa Data Team dashboard.
//
// NON-DEVELOPER GUIDE:
//   • To change colours        → edit the COLORS section below
//   • To change the logo       → update LOGO_PATH (keep the leading /)
//   • To change text           → search for the text in quotes and update it
//   • "Forgot password?" link  → the user types their email; the server
//     prints a reset link to the Terminal window where the server is running.
//     Copy that link and send it to the user (e.g. via Teams or email).
//   • If the page looks broken → open browser DevTools (F12) → Console tab
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthContext';
import { forgotPassword as apiForgotPassword } from './api';

// ── Logo path ─────────────────────────────────────────────────
const LOGO_PATH = '/img/logo-white.png';

// ── Colours ───────────────────────────────────────────────────
const COLORS = {
  burg:     '#8B1A2B',  // ← Primary brand colour
  charcoal: '#363435',
  gray:     '#848688',
  border:   '#E2E0E5',
  inputBg:  '#F4F3F5',
};

// ── Team avatars shown on the left panel ─────────────────────
const TEAM = ['FR','GA','GI','NN','MA','ML','LE','RO','FA','DA','MC','ME','AS','EL','OL'];
const AVATAR_COLORS = {
  FR: { bg: '#F8EEF0', fg: '#8B1A2B' },
  GA: { bg: '#E8EFF9', fg: '#3A6FD8' },
  GI: { bg: '#E6F6F5', fg: '#0E8C88' },
  NN: { bg: '#F0EAF9', fg: '#7A50D0' },
  MA: { bg: '#FBF4E6', fg: '#C88A18' },
  ML: { bg: '#FBF0EB', fg: '#D05A2A' },
  LE: { bg: '#E8F7EF', fg: '#22A55A' },
  RO: { bg: '#FAE8F3', fg: '#C03A8A' },
  FA: { bg: '#F8EEF0', fg: '#8B1A2B' },
  DA: { bg: '#E8EFF9', fg: '#3A6FD8' },
  MC: { bg: '#E6F6F5', fg: '#0E8C88' },
  ME: { bg: '#F0EAF9', fg: '#7A50D0' },
  AS: { bg: '#FBF4E6', fg: '#C88A18' },
  EL: { bg: '#FBF0EB', fg: '#D05A2A' },
  OL: { bg: '#E8F7EF', fg: '#22A55A' },
};

export default function Login() {
  const { login } = useAuth();

  // ── Which form is showing: 'login' or 'forgot' ───────────────
  const [screen, setScreen] = useState('login');

  // ── Sign in state ────────────────────────────────────────────
  const [email, setEmail]       = useState('');
  const [password, setPass]     = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // ── Forgot password state ────────────────────────────────────
  const [forgotEmail, setForgotEmail]   = useState('');
  const [forgotSent, setForgotSent]     = useState(false);
  const [forgotError, setForgotError]   = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // ── Sign in handler ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      setError(msg);
      console.error('Login error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password handler ──────────────────────────────────
  // Sends the request to the server. The server logs a reset link to
  // the Terminal — the admin copies it and sends it to the user.
  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail.trim()) return setForgotError('Please enter your email address.');
    setForgotLoading(true);
    try {
      await apiForgotPassword(forgotEmail.trim());
      setForgotSent(true); // show the "check with your admin" message
    } catch (err) {
      setForgotError('Something went wrong. Please try again or contact your admin.');
      console.error('Forgot password error:', err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Shared input style ───────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1px solid ${COLORS.border}`, background: COLORS.inputBg,
    fontSize: 14, color: COLORS.charcoal, outline: 'none',
    fontFamily: "'DM Sans',sans-serif", boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: '#F7F6F8',
      fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* ── Left panel — branding (hidden on mobile) ─────────── */}
      <div style={{
        width: 420, background: COLORS.burg,
        display: window.innerWidth < 768 ? 'none' : 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 48px',
      }}>
        <div style={{ marginBottom: 48 }}>
          <img
            src={LOGO_PATH}
            alt="TD Africa"
            style={{ height: 72, maxWidth: '100%', objectFit: 'contain', objectPosition: 'left' }}
            onError={e => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div style={{ display: 'none' }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 22, color: '#fff' }}>TD Africa</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Marketing Team</div>
          </div>
        </div>

        <h1 style={{
          fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 800,
          color: '#fff', lineHeight: 1.2, marginBottom: 16,
        }}>
          Your team's work,<br />in one place.
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 48 }}>
          Manage projects, track tasks, and keep your marketing team moving — all from a single dashboard.
        </p>

        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Your team
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TEAM.map(k => (
              <div key={k} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: AVATAR_COLORS[k]?.bg || 'rgba(255,255,255,0.2)',
                color: AVATAR_COLORS[k]?.fg || '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, fontFamily: "'Syne',sans-serif",
                border: '2px solid rgba(255,255,255,0.25)',
              }}>{k}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ───────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 40,
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* ════════════════════════════════════════════════════
              SIGN IN FORM
          ════════════════════════════════════════════════════ */}
          {screen === 'login' && (
            <>
              <h2 style={{
                fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 700,
                color: COLORS.charcoal, marginBottom: 8,
              }}>Sign in to your account</h2>
              <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 32 }}>
                Use your TD Africa email and password.
              </p>

              <form onSubmit={handleSubmit}>
                {/* Email */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: '#5A5860', display: 'block', marginBottom: 6 }}>
                    Email address
                  </label>
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@tdafrica.com"
                    required autoFocus style={inputStyle}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: '#5A5860', display: 'block', marginBottom: 6 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPass(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ ...inputStyle, padding: '10px 42px 10px 14px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      title={showPass ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: COLORS.gray, padding: 0, display: 'flex', alignItems: 'center',
                      }}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Forgot password link */}
                <div style={{ textAlign: 'right', marginBottom: 20 }}>
                  <button
                    type="button"
                    onClick={() => { setScreen('forgot'); setError(''); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, color: COLORS.burg, padding: 0, textDecoration: 'underline',
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    marginBottom: 16, padding: '10px 14px', borderRadius: 8,
                    background: '#FCEAEA', border: '1px solid #F5C6C6',
                    fontSize: 13, color: '#D63B3B',
                  }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '11px 0', borderRadius: 8,
                    background: loading ? '#6B1221' : COLORS.burg,
                    color: '#fff', border: 'none', fontSize: 14, fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: "'DM Sans',sans-serif", transition: 'background .15s',
                  }}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

            </>
          )}

          {/* ════════════════════════════════════════════════════
              FORGOT PASSWORD FORM
          ════════════════════════════════════════════════════ */}
          {screen === 'forgot' && (
            <>
              {/* Back link */}
              <button
                onClick={() => { setScreen('login'); setForgotSent(false); setForgotError(''); setForgotEmail(''); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: COLORS.gray, padding: 0,
                  marginBottom: 24, display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                ← Back to sign in
              </button>

              <h2 style={{
                fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 700,
                color: COLORS.charcoal, marginBottom: 8,
              }}>Forgot your password?</h2>

              {/* ── After form is submitted ── */}
              {forgotSent ? (
                <div>
                  <p style={{ fontSize: 13, color: '#5A5860', lineHeight: 1.6, marginBottom: 16 }}>
                    Your request has been received.
                  </p>
                  {/* Instructions for how the reset works in this app */}
                  <div style={{
                    padding: '14px 16px', borderRadius: 8,
                    background: '#F0EAF9', border: '1px solid #D8CCF5',
                    fontSize: 13, color: '#5A3FA0', lineHeight: 1.6,
                  }}>
                    <strong>Check your email.</strong><br />
                    A password reset link has been sent to your email address.
                    Click the link in the email to set a new password.
                    The link expires after <strong>1 hour</strong>.
                  </div>
                  <button
                    onClick={() => { setScreen('login'); setForgotSent(false); setForgotEmail(''); }}
                    style={{
                      marginTop: 20, width: '100%', padding: '11px 0', borderRadius: 8,
                      background: COLORS.burg, color: '#fff', border: 'none',
                      fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      fontFamily: "'DM Sans',sans-serif",
                    }}
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                // ── The email entry form ──
                <>
                  <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 28 }}>
                    Enter your work email and your admin will be notified to send you a reset link.
                  </p>
                  <form onSubmit={handleForgot}>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 12, color: '#5A5860', display: 'block', marginBottom: 6 }}>
                        Email address
                      </label>
                      <input
                        type="email" value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="you@tdafrica.com"
                        required autoFocus style={inputStyle}
                      />
                    </div>

                    {forgotError && (
                      <div style={{
                        marginBottom: 16, padding: '10px 14px', borderRadius: 8,
                        background: '#FCEAEA', border: '1px solid #F5C6C6',
                        fontSize: 13, color: '#D63B3B',
                      }}>
                        {forgotError}
                      </div>
                    )}

                    <button
                      type="submit" disabled={forgotLoading}
                      style={{
                        width: '100%', padding: '11px 0', borderRadius: 8,
                        background: forgotLoading ? '#6B1221' : COLORS.burg,
                        color: '#fff', border: 'none', fontSize: 14, fontWeight: 600,
                        cursor: forgotLoading ? 'not-allowed' : 'pointer',
                        fontFamily: "'DM Sans',sans-serif",
                      }}
                    >
                      {forgotLoading ? 'Sending…' : 'Send reset request'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

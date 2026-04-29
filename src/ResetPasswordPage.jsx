// src/ResetPasswordPage.jsx
// ─────────────────────────────────────────────────────────────
// Shown when the URL contains ?reset_token=xxxx
// The user enters and confirms a new password, then is redirected
// to the login page once the reset succeeds.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { resetPassword as apiResetPassword } from './api';

const LOGO_PATH = '/img/logo-white.png';
const BURG      = '#8B1A2B';

export default function ResetPasswordPage({ token }) {
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);

  const inputStyle = {
    width: '100%', padding: '10px 42px 10px 14px', borderRadius: 8,
    border: '1px solid #E2E0E5', background: '#F4F3F5',
    fontSize: 14, color: '#363435', outline: 'none',
    fontFamily: "'DM Sans',sans-serif", boxSizing: 'border-box',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match. Please try again.');

    setLoading(true);
    try {
      await apiResetPassword(token, password);
      setSuccess(true);
      // Remove the token from the URL so refreshing doesn't re-show this page
      window.history.replaceState({}, '', window.location.pathname);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. The link may have expired — request a new one.');
      console.error('Reset password error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: '#F7F6F8',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* ── Left branding panel ─────────────────────────────── */}
      <div style={{
        width: 420, background: BURG,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 48px',
      }}>
        <div style={{ marginBottom: 40 }}>
          <img
            src={LOGO_PATH}
            alt="TD Africa"
            style={{ height: 72, maxWidth: '100%', objectFit: 'contain', objectPosition: 'left' }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <div style={{ display: 'none' }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 22, color: '#fff' }}>TD Africa</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Marketing Team</div>
          </div>
        </div>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
          Choose a new<br />password.
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 12, lineHeight: 1.6 }}>
          Pick something secure — at least 8 characters. You'll use it to sign in from now on.
        </p>
      </div>

      {/* ── Right panel — form ─────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 40,
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {success ? (
            // ── Success message ──────────────────────────────
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#E8F7EF', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 20px', fontSize: 26,
              }}>✓</div>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, color: '#363435', marginBottom: 10 }}>
                Password updated!
              </h2>
              <p style={{ fontSize: 13, color: '#848688', marginBottom: 28 }}>
                Your password has been changed. You can now sign in with your new password.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  width: '100%', padding: '11px 0', borderRadius: 8,
                  background: BURG, color: '#fff', border: 'none',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                Go to sign in
              </button>
            </div>
          ) : (
            // ── Password entry form ──────────────────────────
            <>
              <h2 style={{
                fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 700,
                color: '#363435', marginBottom: 8,
              }}>Set a new password</h2>
              <p style={{ fontSize: 13, color: '#848688', marginBottom: 32 }}>
                This link expires after 1 hour. Choose a password you'll remember.
              </p>

              <form onSubmit={handleSubmit}>
                {/* New password */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: '#5A5860', display: 'block', marginBottom: 6 }}>
                    New password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="Min. 8 characters"
                      required autoFocus
                      style={inputStyle}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      title={showPass ? 'Hide' : 'Show password'}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#848688', padding: 0, display: 'flex', alignItems: 'center' }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 12, color: '#5A5860', display: 'block', marginBottom: 6 }}>
                    Confirm new password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConf ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError(''); }}
                      placeholder="Type again to confirm"
                      required
                      style={inputStyle}
                    />
                    <button type="button" onClick={() => setShowConf(v => !v)}
                      title={showConf ? 'Hide' : 'Show password'}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#848688', padding: 0, display: 'flex', alignItems: 'center' }}>
                      {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{
                    marginBottom: 16, padding: '10px 14px', borderRadius: 8,
                    background: '#FCEAEA', border: '1px solid #F5C6C6',
                    fontSize: 13, color: '#D63B3B',
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '11px 0', borderRadius: 8,
                    background: loading ? '#6B1221' : BURG,
                    color: '#fff', border: 'none', fontSize: 14, fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: "'DM Sans',sans-serif", transition: 'background .15s',
                  }}
                >
                  {loading ? 'Saving…' : 'Set new password'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

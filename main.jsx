import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider, useAuth } from './src/AuthContext'
import { SocketProvider } from './src/SocketContext'
import App from './index.jsx'
import Login from './src/Login.jsx'
import ResetPasswordPage from './src/ResetPasswordPage.jsx'

// ── Check for a password reset token in the URL ───────────────
// When a user clicks a reset link (e.g. http://localhost:5173?reset_token=abc123)
// we read that token here and show the reset form instead of the normal app.
function getResetToken() {
  return new URLSearchParams(window.location.search).get('reset_token');
}

// Decides what to render based on URL and auth state
function Root() {
  const { user, loading } = useAuth();
  const resetToken = getResetToken();

  // Still checking the saved JWT — show a blank loading screen
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: "'DM Sans',sans-serif", color: '#848688', fontSize: 14,
      }}>
        Loading…
      </div>
    );
  }

  // ── Password reset link clicked → show the reset form ────────
  // This takes priority over everything else (login or dashboard)
  if (resetToken) {
    return <ResetPasswordPage token={resetToken} />;
  }

  // ── Not logged in → login page ───────────────────────────────
  // ── Logged in     → dashboard ───────────────────────────────
  return (
    // SocketProvider opens the real-time connection once the user is logged in.
    // It passes the user so the socket knows who it belongs to.
    <SocketProvider user={user}>
      {user ? <App /> : <Login />}
    </SocketProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>
)

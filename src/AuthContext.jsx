// src/AuthContext.jsx
// Provides the logged-in user to the entire app.
// Any component can call useAuth() to get: { user, login, logout, loading }

import { createContext, useContext, useState, useEffect } from 'react';
import { login as loginApi, autoLogin as autoLoginApi, getMe } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while checking saved token

  // On app load, restore a saved session OR auto-login with the shared team account.
  // This means the dashboard opens immediately without any login prompt.
  // Team members can still sign in personally via the Sign In button.
  useEffect(() => {
    const stored = localStorage.getItem('token');
    const finish = (userData) => { setUser(userData || null); setLoading(false); };

    if (stored) {
      // Validate the saved token — if expired, fall back to auto-login
      getMe()
        .then(res => finish(res.data.user))
        .catch(() => {
          localStorage.removeItem('token');
          // Token expired — get a fresh shared session
          autoLoginApi()
            .then(res => { localStorage.setItem('token', res.data.token); finish(res.data.user); })
            .catch(() => finish(null));
        });
    } else if (!sessionStorage.getItem('signed_out')) {
      // No token and user hasn't manually signed out — open directly with shared session
      autoLoginApi()
        .then(res => { localStorage.setItem('token', res.data.token); finish(res.data.user); })
        .catch(() => finish(null)); // server not reachable → fall back to login page
    } else {
      // User signed out deliberately — show the login page
      finish(null);
    }
  }, []);

  // Call this from the Login page
  const login = async (email, password) => {
    const res = await loginApi(email, password);
    localStorage.setItem('token', res.data.token);
    sessionStorage.removeItem('signed_out'); // clear any previous sign-out flag
    setUser(res.data.user);
    return res.data.user;
  };

  // Call this after registration — server already validated and returned the token
  const loginWithToken = (token, user) => {
    localStorage.setItem('token', token);
    sessionStorage.removeItem('signed_out');
    setUser(user);
  };

  // Call this to sign out — sets a flag so auto-login doesn't fire until the browser tab closes
  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.setItem('signed_out', '1');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithToken, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Shorthand hook — use this in any component
export const useAuth = () => useContext(AuthContext);

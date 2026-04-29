// src/SocketContext.jsx
// Provides a single shared Socket.io connection to the whole app.
//
// HOW IT WORKS:
//   • When a user logs in, a socket connection is opened to the server.
//   • When they log out, the socket is closed.
//   • Any component can call useSocket() to send or listen for events.
//   • Desktop notifications are also requested here — the browser will ask
//     the user for permission the first time.

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ user, children }) {
  const socketRef   = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Only connect when a user is logged in
    if (!user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // ── Open the socket connection ──────────────────────────────
    // auth.token is verified by the server before any events are accepted.
    //
    // VITE_API_URL is set on Vercel to point at the Render backend.
    // In dev it is unset, so we fall back to window.location.origin (proxied by Vite).
    // On Render (full-stack), it is also unset, so window.location.origin is correct.
    const SERVER_URL = import.meta.env.VITE_API_URL ?? window.location.origin;
    const socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling'], // polling fallback for Render's network
    });

    socketRef.current = socket;

    socket.on('connect',    () => { setConnected(true);  console.log('💬 Socket connected'); });
    socket.on('disconnect', () => { setConnected(false); console.log('💬 Socket disconnected'); });
    socket.on('connect_error', (err) => console.error('Socket error:', err.message));

    // ── Listen for desktop notification events ──────────────────
    // When another user triggers notify:broadcast, this fires for everyone else
    socket.on('notify:receive', ({ title, body, icon }) => {
      showDesktopNotification(title, body, icon);
    });

    // ── Listen for data refresh events ───────────────────────────
    // When any user creates/updates/deletes a task or project, the server
    // broadcasts data:refresh so every open browser reloads its data.
    socket.on('data:refresh', ({ type }) => {
      window.dispatchEvent(new CustomEvent('app:data-refresh', { detail: { type } }));
    });

    // ── Request browser notification permission ─────────────────
    // The browser will show a pop-up asking the user to allow notifications.
    // Once allowed, it remembers — user is not asked again on future visits.
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') console.log('✅ Desktop notifications enabled');
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user?.id]); // reconnect if a different user logs in

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

// ── Hook: access the socket from any component ────────────────
export function useSocket() {
  return useContext(SocketContext);
}

// ── Helper: show a native browser desktop notification ────────
// Falls back silently if the browser doesn't support it or permission denied.
export function showDesktopNotification(title, body, icon = '/img/logo-white.png') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const n = new Notification(title, { body, icon });
  // Auto-close after 5 seconds
  setTimeout(() => n.close(), 5000);
  // Clicking the notification focuses the app tab
  n.onclick = () => { window.focus(); n.close(); };
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/client.js';

const AuthContext = createContext(null);
const SESSION_KEY = 'esquina_session';

function readSession() {
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored);
    if (typeof session?.token === 'string' && session.token && session.usuario && typeof session.usuario === 'object') return session;
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    try { window.localStorage.removeItem(SESSION_KEY); } catch { return null; }
  }
  return null;
}

function persistSession(session) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    return;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [isSessionReady, setIsSessionReady] = useState(() => !session);
  const token = session?.token;

  useEffect(() => {
    if (!token) {
      setIsSessionReady(true);
      return undefined;
    }

    let cancelled = false;
    authApi.obtenerSesion(token).then((result) => {
      if (cancelled) return;
      const refreshedSession = { token, usuario: result.data };
      persistSession(refreshedSession);
      setSession(refreshedSession);
    }).catch((error) => {
      if (cancelled || error.status !== 401) return;
      persistSession(null);
      setSession(null);
    }).finally(() => {
      if (!cancelled) setIsSessionReady(true);
    });

    return () => { cancelled = true; };
  }, [token]);

  const login = useCallback(async (credentials) => {
    const result = await authApi.iniciarSesion(credentials);
    const nextSession = { token: result.token, usuario: result.usuario };
    persistSession(nextSession);
    setSession(nextSession);
    return result.usuario;
  }, []);

  const register = useCallback((userData) => authApi.registrar(userData), []);
  const logout = useCallback(() => {
    persistSession(null);
    setSession(null);
  }, []);

  const value = useMemo(() => ({
    token: session?.token || null,
    usuario: session?.usuario || null,
    isAuthenticated: Boolean(session?.token),
    isSessionReady,
    login,
    register,
    logout
  }), [session, isSessionReady, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  return context;
}

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { TOKEN_KEY } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState(false);

  const bootstrap = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setBootError(false);
    api.get('/api/auth/me')
      .then(res => setUser(res.data))
      .catch(err => {
        // 401 is handled by the api interceptor (token cleared).
        // Anything else means the server is unreachable (e.g. waking up).
        if (err.response?.status !== 401) setBootError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  useEffect(() => {
    const onForcedLogout = () => setUser(null);
    window.addEventListener('auth:logout', onForcedLogout);
    return () => window.removeEventListener('auth:logout', onForcedLogout);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, bootError, retry: bootstrap, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
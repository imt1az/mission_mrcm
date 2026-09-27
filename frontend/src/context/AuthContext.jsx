import { createContext, useContext, useEffect, useState } from 'react';
import { api, csrf } from '../lib/api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    csrf()
      .then(() => api.get('/auth/user'))
      .then((r) => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  async function signOut() {
    await api.post('/auth/logout');
    setUser(null);
  }
  return (
    <AuthContext.Provider value={{ user, setUser, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Auth provider is missing');
  return context;
}

import { createContext, useContext, useState, useEffect } from 'react';

/* eslint-disable react-refresh/only-export-components */
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay token guardado en localStorage
    const token = localStorage.getItem('spotify_access_token');
    const userData = localStorage.getItem('user_data');
    const guestMode = localStorage.getItem('guest_mode');
    
    if (token && userData) {
      setAccessToken(token);
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
      setIsGuest(false);
    } else if (guestMode === 'true') {
      setIsGuest(true);
      setIsAuthenticated(false);
    }
    
    setLoading(false);
  }, []);

  const loginAsGuest = () => {
    setIsGuest(true);
    setIsAuthenticated(false);
    localStorage.setItem('guest_mode', 'true');
  };

  const login = (tokenData, userData) => {
    setAccessToken(tokenData.access_token);
    setUser(userData);
    setIsAuthenticated(true);
    setIsGuest(false);
    
    localStorage.setItem('spotify_access_token', tokenData.access_token);
    localStorage.setItem('refresh_token', tokenData.refresh_token);
    localStorage.setItem('user_data', JSON.stringify(userData));
    localStorage.setItem('token_expires_at', Date.now() + tokenData.expires_in * 1000);
    localStorage.removeItem('guest_mode');
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(false);
    
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('guest_mode');
  };

  const requireAuth = () => {
    if (!isAuthenticated) {
      return {
        allowed: false,
        message: 'Necesitas iniciar sesión para acceder a esta función'
      };
    }
    return { allowed: true };
  };

  const value = {
    isAuthenticated,
    isGuest,
    user,
    accessToken,
    loading,
    loginAsGuest,
    login,
    logout,
    requireAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useState, useContext, useEffect } from "react";
import { getStoredToken, setStoredToken, clearStoredToken } from "../utils/tokenHelper";

interface AuthContextType {
  token: string | null;
  setToken: (t: string | null) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
  isAuthenticated: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, _setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = getStoredToken();
      console.log('🔐 SimpleAuthContext init token:', stored ? 'Found' : 'Missing');
      return stored;
    }
    return null;
  });

  // Check for token changes with robust storage
  React.useEffect(() => {
    const checkToken = () => {
      const stored = getStoredToken();
      if (stored && stored !== token) {
        console.log('🔄 Token updated from robust storage');
        _setToken(stored);
      }
    };
    
    // Check every 2 seconds
    const interval = setInterval(checkToken, 2000);
    return () => clearInterval(interval);
  }, [token]);

  const setToken = (t: string | null) => {
    _setToken(t);
    if (t) {
      setStoredToken(t);
      console.log("💾 Token saved with robust storage");
    } else {
      clearStoredToken();
      console.log("🗑️ Token cleared with robust storage");
    }
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, setToken, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
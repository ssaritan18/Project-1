import React, { createContext, useState, useContext, useEffect } from "react";

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
      const stored = localStorage.getItem("adhders_token_v1");
      console.log('🔐 SimpleAuthContext init token:', stored ? 'Found' : 'Missing');
      return stored;
    }
    return null;
  });

  // Check for token changes in localStorage
  React.useEffect(() => {
    const checkToken = () => {
      const stored = localStorage.getItem("adhders_token_v1");
      if (stored && stored !== token) {
        console.log('🔄 Token updated from localStorage');
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
      localStorage.setItem("adhders_token_v1", t);
      console.log("💾 Token saved to storage with key: adhders_token_v1");
    } else {
      localStorage.removeItem("adhders_token_v1");
      console.log("🗑️ Token cleared from storage");
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
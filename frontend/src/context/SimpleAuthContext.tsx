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
      return localStorage.getItem("adhders_token_v1");
    }
    return null;
  });

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
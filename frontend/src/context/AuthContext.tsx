import React, { createContext, useContext, useMemo, useState, ReactNode, useEffect } from "react";
import { Alert } from "react-native";
import { PERSIST_ENABLED, KEYS } from "../config";
import { loadJSON, saveJSON } from "../utils/persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setAuthToken } from "../lib/api";


export type User = {
  name: string;
  email?: string;
  photoBase64?: string | null;
};

export type Palette = { primary: string; secondary: string; accent: string };

export type Credentials = {
  email: string;
  password: string;
};

type AuthContextType = {
  isAuthed: boolean;
  user: User | null;
  loading: boolean;
  palette: Palette;
  token: string | null;
  setPalette: (p: Palette) => void;
  signIn: (user: Partial<User>) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  resetCredentials: (email?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setAuthed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [palette, setPaletteState] = useState<Palette>({ primary: "#A3C9FF", secondary: "#FFCFE1", accent: "#B8F1D9" });
  const [token, _setToken] = useState<string | null>(() => {
    // Initialize token from localStorage on web, AsyncStorage on mobile
    if (typeof window !== 'undefined') {
      return localStorage.getItem(KEYS.token);
    }
    return null;
  });

  const setToken = (t: string | null) => {
    _setToken(t);
    if (t) {
      // Persist token to storage
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEYS.token, t);
        console.log('💾 Token saved to localStorage with key:', KEYS.token);
      }
      setAuthToken(t);
      saveJSON(KEYS.token, t); // Also save via saveJSON for mobile compatibility
    } else {
      // Clear token from storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(KEYS.token);
        console.log('🗑️ Token cleared from localStorage');
      }
      setAuthToken(null);
    }
  };

  useEffect(() => {
    (async () => {
      if (PERSIST_ENABLED) {
        const storedPalette = await loadJSON<Palette | null>(KEYS.palette, null);
        if (storedPalette) setPaletteState(storedPalette);
        const storedUser = await loadJSON<User | null>(KEYS.user, null);
        if (storedUser) { setUser(storedUser); setAuthed(true); }
        
        // Load token from storage if not already loaded
        if (!token) {
          const t = await loadJSON<string | null>(KEYS.token, null);
          if (t) {
            setToken(t);
            try {
              const me = await api.get("/me");
              const u: User = { name: me.data.name, email: me.data.email, photoBase64: me.data.photo_base64 };
              setUser(u); setAuthed(true);
              if (PERSIST_ENABLED) await saveJSON(KEYS.user, u);
            } catch (error) {
              console.warn('⚠️ Token validation failed:', error);
              setToken(null); // Clear invalid token
            }
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  const setPalette = (p: Palette) => {
    setPaletteState(p);
    if (PERSIST_ENABLED) saveJSON(KEYS.palette, p);
  };

  const signIn = async (u: Partial<User>) => {
    const cleaned: User = { name: (u.name || "You").trim(), email: u.email?.trim(), photoBase64: u.photoBase64 || null };
    setUser(cleaned);
    setAuthed(true);
    if (PERSIST_ENABLED) await saveJSON(KEYS.user, cleaned);
  };

  const register = async (name: string, email: string, password: string) => {
    console.log("🔧 register called:", { syncEnabled: true, name, email });
    if (true) {
      console.log("📡 Making register API call to backend...");
      console.log("🔗 Backend URL:", process.env.EXPO_PUBLIC_BACKEND_URL);
      try {
        const res = await api.post("/auth/register", { name, email, password });
        console.log("✅ Register response:", res.data);
        
        // New flow: Registration returns message instead of token
        const message = res.data?.message || "Registration successful!";
        const emailSent = res.data?.email_sent || false;
        
        Alert.alert(
          "Registration Successful! 🎉", 
          `${message}\n\n${emailSent ? "📧 Verification email sent!" : "⚠️ Email not configured - check with admin"}`,
          [{ text: "OK" }]
        );
        
        console.log("📧 Email verification required - user should check email");
        // Don't set token or auto-login - user needs to verify email first
        
      } catch (e) {
        console.error("❌ Register API call failed:", e);
        Alert.alert("Registration Error", `Registration failed: ${JSON.stringify(e)}`);
        throw e;
      }
      return;
    }
    console.log("📱 Using local register (sync disabled)");
    const newUser: User = { name: name.trim() || "You", email: email.trim() };
    const creds: Credentials = { email: email.trim(), password };
    setUser(newUser);
    setAuthed(true);
    if (PERSIST_ENABLED) { await saveJSON(KEYS.user, newUser); await saveJSON(KEYS.credentials, creds); }
  };

  const login = async (email: string, password: string) => {
    console.log("🔧 login called:", { syncEnabled: true, email });
    if (true) {
      console.log("📡 Making login API call to backend...");
      try {
        const res = await api.post("/auth/login", { email, password });
        console.log("✅ Login API response received:", res.status);
        
        if (res.data?.access_token) {
          const token = res.data.access_token;
          setToken(token); // This will handle persistence to both memory and localStorage
          
          // Use robust token storage - import at top instead of dynamic import
          console.log('🔐 Main AuthContext: Token will be set via SimpleAuthContext');
        }
          
          // Try to get user profile
          try {
            const profileRes = await api.get("/auth/me");
            if (profileRes.data) {
              const userData = { 
                name: profileRes.data.name || email, 
                email: profileRes.data.email || email 
              };
              setUser(userData);
              await saveJSON(KEYS.user, userData);
              setAuthed(true);
              console.log("✅ Login successful, user profile loaded:", userData.name);
            }
          } catch (profileError) {
            console.warn("⚠️ Profile fetch failed, using email as name:", profileError);
            const userData = { name: email, email };
            setUser(userData);
            await saveJSON(KEYS.user, userData);
            setAuthed(true);
          }
        } else {
          throw new Error("No access token received");
        }
      } catch (error: any) {
        console.error("❌ Login error:", error);
        
        // Handle specific error types
        if (error.response?.status === 401) {
          throw new Error("Invalid email or password. Please check your credentials.");
        } else if (error.response?.status === 403) {
          throw new Error("Account not verified. Please check your email for verification instructions.");
        } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('timeout')) {
          throw new Error("Connection timeout. Please check your internet connection and try again.");
        } else if (error.response?.status >= 500) {
          throw new Error("Server error. Please try again later.");
        } else {
          throw new Error(error.response?.data?.detail || error.message || "Login failed. Please try again.");
        }
      }
    } else {
      // Local mode fallback
      const fakeUser = { name: email.split("@")[0], email };
      setUser(fakeUser);
      await saveJSON(KEYS.user, fakeUser);
      setAuthed(true);
    }
  };

  const resetCredentials = async (email?: string) => {
    if (PERSIST_ENABLED) {
      const stored = await loadJSON<Credentials | null>(KEYS.credentials, null);
      await AsyncStorage.removeItem(KEYS.credentials);
      if (stored && email && stored.email?.toLowerCase() === email.trim().toLowerCase()) {
        await AsyncStorage.removeItem(KEYS.user);
        setUser(null); setAuthed(false); // reset auth after clearing credentials
      }
    }
  };

  // eslint-disable-next-line semi
  const signOut = async () => {
    console.log("🚪 signOut called");
    
    // Clear all authentication state
    setAuthed(false); 
    setUser(null); 
    setToken(null); 
    setAuthToken(null);
    
    console.log("🔄 State cleared, removing from storage...");
    
    if (PERSIST_ENABLED) {
      try {
        // Clear user data from storage
        await AsyncStorage.removeItem(KEYS.user); 
        await saveJSON(KEYS.user, null);
        console.log("✅ SignOut completed - storage cleared");
      } catch (error) {
        console.error("❌ Error clearing storage during signOut:", error);
      }
    }
    
    // Force state update by triggering re-render
    console.log("🔄 Forcing auth state update...");
  };

  const value = useMemo(() => ({ 
    isAuthed, 
    isAuthenticated: isAuthed,  // Add alias for compatibility
    user, 
    loading,
    palette, 
    token, 
    setPalette, 
    signIn, 
    register, 
    login, 
    resetCredentials, 
    signOut 
  }), [isAuthed, user, loading, palette, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be used within AuthProvider"); return ctx; }
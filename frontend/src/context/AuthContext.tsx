import React, { createContext, useContext, useMemo, useState, ReactNode, useEffect } from "react";
import { Alert } from "react-native";
import { PERSIST_ENABLED, KEYS } from "../config";
import { loadJSON, saveJSON } from "../utils/persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setAuthToken } from "../lib/api";
import { useRuntimeConfig } from "./RuntimeConfigContext";

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
  const { syncEnabled } = useRuntimeConfig();
  const [isAuthed, setAuthed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [palette, setPaletteState] = useState<Palette>({ primary: "#A3C9FF", secondary: "#FFCFE1", accent: "#B8F1D9" });
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (PERSIST_ENABLED) {
        const storedPalette = await loadJSON<Palette | null>(KEYS.palette, null);
        if (storedPalette) setPaletteState(storedPalette);
        const storedUser = await loadJSON<User | null>(KEYS.user, null);
        if (storedUser) { setUser(storedUser); setAuthed(true); }
        if (syncEnabled) {
          const t = await loadJSON<string | null>(KEYS.token, null);
          if (t) {
            setToken(t); setAuthToken(t);
            try {
              const me = await api.get("/me");
              const u: User = { name: me.data.name, email: me.data.email, photoBase64: me.data.photo_base64 };
              setUser(u); setAuthed(true);
              if (PERSIST_ENABLED) await saveJSON(KEYS.user, u);
            } catch {}
          }
        }
      }
    })();
  }, [syncEnabled]);

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
    console.log("🔧 register called:", { syncEnabled, name, email });
    if (syncEnabled) {
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
    console.log("🔧 login called:", { syncEnabled, email });
    if (syncEnabled) {
      console.log("📡 Making login API call to backend...");
      try {
        const res = await api.post("/auth/login", { email, password });
        console.log("✅ Login response:", res.data);
        const t = res.data?.access_token as string;
        console.log("🔑 Login token received:", t ? "Yes" : "No");
        setToken(t); setAuthToken(t);
        if (PERSIST_ENABLED) await saveJSON(KEYS.token, t);
        console.log("💾 Login token saved to storage");
        try {
          const me = await api.get("/me");
          const u: User = { name: me.data.name, email: me.data.email, photoBase64: me.data.photo_base64 };
          setUser(u); setAuthed(true);
          if (PERSIST_ENABLED) await saveJSON(KEYS.user, u);
          console.log("✅ Login user profile loaded:", u);
        } catch (e) {
          console.log("❌ /me failed during login, using fallback:", e);
          const u: User = { name: "You", email };
          setUser(u); setAuthed(true);
          if (PERSIST_ENABLED) await saveJSON(KEYS.user, u);
        }
      } catch (e) {
        console.error("❌ Login API call failed:", e);
        Alert.alert("Login Error", `Login failed: ${JSON.stringify(e)}`);
        throw e; // Don't proceed with local login if online login fails
      }
      return;
    }
    console.log("📱 Using local login (sync disabled)");
    let ok = false;
    if (PERSIST_ENABLED) {
      const stored = await loadJSON<Credentials | null>(KEYS.credentials, null);
      if (stored && stored.email?.toLowerCase() === email.trim().toLowerCase() && stored.password === password) {
        ok = true
      }
    }
    if (ok) {
      const storedUser = await loadJSON<User | null>(KEYS.user, null);
      if (storedUser) { setUser(storedUser); setAuthed(true); return; }
    }
    const fallback: User = { name: "Tester", email: email.trim() };
    setUser(fallback); setAuthed(true);
    if (PERSIST_ENABLED) await saveJSON(KEYS.user, fallback);
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
    setAuthed(false); setUser(null); setToken(null); setAuthToken(null);
    console.log("🔄 State cleared, removing from storage...");
    if (PERSIST_ENABLED) { 
      await AsyncStorage.removeItem(KEYS.user); 
      await AsyncStorage.removeItem(KEYS.token);
      console.log("✅ SignOut completed - storage cleared");
    }
  };

  const value = useMemo(() => ({ isAuthed, user, palette, token, setPalette, signIn, register, login, resetCredentials, signOut }), [isAuthed, user, palette, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be used within AuthProvider"); return ctx; }
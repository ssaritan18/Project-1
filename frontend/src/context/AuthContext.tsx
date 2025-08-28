import React, { createContext, useContext, useMemo, useState, ReactNode, useEffect } from "react";
import { PERSIST_ENABLED, KEYS, SYNC_ENABLED } from "../config";
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
  password: string; // Offline-only MVP (PIN or password). Not secure; stored locally.
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
        if (storedUser) {
          setUser(storedUser);
          setAuthed(true);
        }
        if (SYNC_ENABLED) {
          const t = await loadJSON<string | null>(KEYS.token, null);
          if (t) {
            setToken(t);
            setAuthToken(t);
            try {
              // optional: hydrate user from server
              const me = await api.get("/me");
              const u: User = { name: me.data.name, email: me.data.email, photoBase64: me.data.photo_base64 };
              setUser(u);
              setAuthed(true);
            } catch {
              // token might be invalid; ignore for now
            }
          }
        }
      }
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
    if (SYNC_ENABLED) {
      const res = await api.post("/auth/register", { name, email, password });
      const t = res.data?.access_token as string;
      setToken(t); setAuthToken(t);
      if (PERSIST_ENABLED) await saveJSON(KEYS.token, t);
      // fetch profile
      try {
        const me = await api.get("/me");
        const u: User = { name: me.data.name, email: me.data.email, photoBase64: me.data.photo_base64 };
        setUser(u); setAuthed(true);
        if (PERSIST_ENABLED) await saveJSON(KEYS.user, u);
      } catch {
        const u: User = { name, email };
        setUser(u); setAuthed(true);
        if (PERSIST_ENABLED) await saveJSON(KEYS.user, u);
      }
      return;
    }
    // Offline fallback
    const newUser: User = { name: name.trim() || "You", email: email.trim() };
    const creds: Credentials = { email: email.trim(), password };
    setUser(newUser);
    setAuthed(true);
    if (PERSIST_ENABLED) {
      await saveJSON(KEYS.user, newUser);
      await saveJSON(KEYS.credentials, creds);
    }
  };

  const login = async (email: string, password: string) => {
    if (SYNC_ENABLED) {
      const res = await api.post("/auth/login", { email, password });
      const t = res.data?.access_token as string;
      setToken(t); setAuthToken(t);
      if (PERSIST_ENABLED) await saveJSON(KEYS.token, t);
      try {
        const me = await api.get("/me");
        const u: User = { name: me.data.name, email: me.data.email, photoBase64: me.data.photo_base64 };
        setUser(u); setAuthed(true);
        if (PERSIST_ENABLED) await saveJSON(KEYS.user, u);
      } catch {
        const u: User = { name: "You", email };
        setUser(u); setAuthed(true);
        if (PERSIST_ENABLED) await saveJSON(KEYS.user, u);
      }
      return;
    }
    // Offline fallback
    let ok = false;
    if (PERSIST_ENABLED) {
      const stored = await loadJSON<Credentials | null>(KEYS.credentials, null);
      if (stored && stored.email?.toLowerCase() === email.trim().toLowerCase() && stored.password === password) {
        ok = true;
        const storedUser = await loadJSON<User | null>(KEYS.user, null);
        if (storedUser) {
          setUser(storedUser);
          setAuthed(true);
          return;
        }
      }
    }
    if (!ok) {
      const fallback: User = { name: "Tester", email: email.trim() };
      setUser(fallback);
      setAuthed(true);
      if (PERSIST_ENABLED) await saveJSON(KEYS.user, fallback);
    }
  };

  const resetCredentials = async (email?: string) => {
    if (PERSIST_ENABLED) {
      const stored = await loadJSON<Credentials | null>(KEYS.credentials, null);
      await AsyncStorage.removeItem(KEYS.credentials);
      if (stored && email && stored.email?.toLowerCase() === email.trim().toLowerCase()) {
        await AsyncStorage.removeItem(KEYS.user);
        setUser(null);
        setAuthed(false);
      }
    }
  };

  const signOut = async () => {
    setAuthed(false);
    setUser(null);
    setToken(null);
    setAuthToken(null);
    if (PERSIST_ENABLED) {
      await AsyncStorage.removeItem(KEYS.user);
      await AsyncStorage.removeItem(KEYS.token);
    }
  };

  const value = useMemo(
    () => ({ isAuthed, user, palette, token, setPalette, signIn, register, login, resetCredentials, signOut }),
    [isAuthed, user, palette, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
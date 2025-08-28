import React, { createContext, useContext, useMemo, useState, ReactNode, useEffect } from "react";
import { PERSIST_ENABLED, KEYS } from "../config";
import { loadJSON, saveJSON } from "../utils/persist";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  setPalette: (p: Palette) => void;
  // Quick sign-in (legacy continue)
  signIn: (user: Partial<User>) => Promise<void>;
  // Auth flows
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
    // If not using persistence or no creds, allow fallback: quick local sign-in
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
      // If resetting for the same email, also clear the user to force new signup
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
    if (PERSIST_ENABLED) await AsyncStorage.removeItem(KEYS.user);
  };

  const value = useMemo(
    () => ({ isAuthed, user, palette, setPalette, signIn, register, login, resetCredentials, signOut }),
    [isAuthed, user, palette]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
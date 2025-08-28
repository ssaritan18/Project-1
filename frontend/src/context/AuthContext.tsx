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

type AuthContextType = {
  isAuthed: boolean;
  user: User | null;
  palette: Palette;
  signIn: (user: Partial<User>) => Promise<void>;
  signOut: () => Promise<void>;
  setPalette: (p: Palette) => void;
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

  const signOut = async () => {
    setAuthed(false);
    setUser(null);
    if (PERSIST_ENABLED) await AsyncStorage.removeItem(KEYS.user);
  };

  const value = useMemo(
    () => ({ isAuthed, user, palette, signIn, signOut, setPalette }),
    [isAuthed, user, palette]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
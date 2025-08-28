import React, { createContext, useContext, useMemo, useState, ReactNode, useEffect } from "react";
import { PERSIST_ENABLED, KEYS } from "../config";
import { loadJSON, saveJSON } from "../utils/persist";

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
  signIn: (user: Partial<User>) => void;
  signOut: () => void;
  setPalette: (p: Palette) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setAuthed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [palette, setPaletteState] = useState<Palette>({ primary: "#A3C9FF", secondary: "#FFCFE1", accent: "#B8F1D9" });

  useEffect(() => {
    if (!PERSIST_ENABLED) return;
    (async () => {
      const stored = await loadJSON<Palette | null>(KEYS.palette, null);
      if (stored) setPaletteState(stored);
    })();
  }, []);

  const setPalette = (p: Palette) => {
    setPaletteState(p);
    if (PERSIST_ENABLED) saveJSON(KEYS.palette, p);
  };

  const value = useMemo(
    () => ({
      isAuthed,
      user,
      palette,
      signIn: (u: Partial<User>) => {
        setUser({ name: u.name || "You", email: u.email, photoBase64: u.photoBase64 || null });
        setAuthed(true);
      },
      signOut: () => {
        setAuthed(false);
        setUser(null);
      },
      setPalette,
    }),
    [isAuthed, user, palette]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
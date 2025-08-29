import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";

const KEY_SYNC = "adhders_sync_enabled";
const KEY_WS = "adhders_ws_enabled";

type RuntimeConfig = {
  hydrated: boolean;
  syncEnabled: boolean;
  wsEnabled: boolean;
  webSocket: WebSocket | null;
  setSyncEnabled: (v: boolean) => Promise<void>;
  setWsEnabled: (v: boolean) => Promise<void>;
};

const Ctx = createContext<RuntimeConfig | undefined>(undefined);

export function RuntimeConfigProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [syncEnabled, setSyncEnabledState] = useState(false);
  const [wsEnabled, setWsEnabledState] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rawS = await AsyncStorage.getItem(KEY_SYNC);
        if (rawS != null) setSyncEnabledState(rawS === "true");
        const rawW = await AsyncStorage.getItem(KEY_WS);
        if (rawW != null) setWsEnabledState(rawW === "true");
      } catch {}
      setHydrated(true);
    })();
  }, []);

  const setSyncEnabled = async (v: boolean) => {
    setSyncEnabledState(v);
    try { await AsyncStorage.setItem(KEY_SYNC, v ? "true" : "false"); } catch {}
  };
  const setWsEnabled = async (v: boolean) => {
    setWsEnabledState(v);
    try { await AsyncStorage.setItem(KEY_WS, v ? "true" : "false"); } catch {}
  };

  const value = useMemo(() => ({ hydrated, syncEnabled, wsEnabled, setSyncEnabled, setWsEnabled }), [hydrated, syncEnabled, wsEnabled]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRuntimeConfig() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRuntimeConfig must be used within RuntimeConfigProvider");
  return ctx;
}
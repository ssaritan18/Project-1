import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "adhders_sync_enabled";

type RuntimeConfig = {
  hydrated: boolean;
  syncEnabled: boolean;
  setSyncEnabled: (v: boolean) => Promise<void>;
};

const Ctx = createContext<RuntimeConfig | undefined>(undefined);

export function RuntimeConfigProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [syncEnabled, setSyncEnabledState] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw != null) setSyncEnabledState(raw === "true");
      } catch {}
      setHydrated(true);
    })();
  }, []);

  const setSyncEnabled = async (v: boolean) => {
    setSyncEnabledState(v);
    try { await AsyncStorage.setItem(KEY, v ? "true" : "false"); } catch {}
  };

  const value = useMemo(() => ({ hydrated, syncEnabled, setSyncEnabled }), [hydrated, syncEnabled]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRuntimeConfig() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRuntimeConfig must be used within RuntimeConfigProvider");
  return ctx;
}
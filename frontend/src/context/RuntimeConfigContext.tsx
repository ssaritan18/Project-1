import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStoredToken } from "../utils/tokenHelper";

const KEY_SYNC = "adhders_sync_enabled";
const KEY_WS = "adhders_ws_enabled";

type RuntimeConfig = {
  hydrated: boolean;
  syncEnabled: boolean;
  wsEnabled: boolean;
  webSocket: WebSocket | null;
  mode: "sync" | "local";
  setSyncEnabled: (v: boolean) => Promise<void>;
  setWsEnabled: (v: boolean) => Promise<void>;
};

const Ctx = createContext<RuntimeConfig | undefined>(undefined);

export function RuntimeConfigProvider({ children, token }: { children: React.ReactNode; token?: string }) {
  const [hydrated, setHydrated] = useState(false);
  // Force sync/online mode in production, allow local mode only for development/demo
  const [syncEnabled, setSyncEnabledState] = useState(() => {
    // Check if this is production build
    const isProduction = process.env.NODE_ENV === 'production' || process.env.EXPO_PUBLIC_BACKEND_URL?.includes('preview.emergentagent.com');
    return isProduction; // Force online mode in production
  });
  const [wsEnabled, setWsEnabledState] = useState(true);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);

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

  // WebSocket management
  useEffect(() => {
    const storedToken = getStoredToken();
    console.log("🔌 RuntimeConfig: WebSocket effect triggered", { syncEnabled, token: !!storedToken });
    
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000; // 3 seconds

    const connectWebSocket = () => {
      const storedToken = getStoredToken();
      if (!syncEnabled || !storedToken) {
        console.log("🔌 RuntimeConfig: Skipping WebSocket - not ready", { syncEnabled, hasToken: !!storedToken });
        setWebSocket(null);
        setWsEnabled(false);
        return;
      }

      try {
        const wsUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL?.replace('http', 'ws')}/api/ws?token=${storedToken}`;
        console.log('🔌 RuntimeConfig: Connecting WebSocket:', wsUrl.replace(storedToken, 'TOKEN_HIDDEN'));
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('✅ RuntimeConfig: WebSocket connected successfully');
          setWebSocket(ws);
          setWsEnabled(true);
          reconnectAttempts = 0; // Reset attempts on successful connection
          
          // Start heartbeat to keep connection alive
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          heartbeatTimer = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
              console.log('💓 RuntimeConfig: Heartbeat sent');
            }
          }, 30000); // Send heartbeat every 30 seconds
        };
        
        ws.onclose = () => {
          console.log('🔌 RuntimeConfig: WebSocket closed');
          setWebSocket(null);
          setWsEnabled(false);
          
          if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
          }
          
          // Auto-reconnect if sync mode is still enabled and we haven't exceeded attempts
          if (syncEnabled && token && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`🔄 RuntimeConfig: Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
            
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connectWebSocket, reconnectDelay);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.log('❌ RuntimeConfig: Max reconnection attempts reached');
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ RuntimeConfig: WebSocket error:', error);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle pong response to keep connection alive
            if (data.type === 'pong') {
              console.log('💓 RuntimeConfig: Heartbeat pong received');
              return;
            }
            
            // Handle other WebSocket messages
            console.log('📨 RuntimeConfig: WebSocket message received:', data.type);
          } catch (error) {
            console.error('❌ RuntimeConfig: WebSocket message parsing error:', error);
          }
        };
        
      } catch (error) {
        console.error('❌ RuntimeConfig: WebSocket connection error:', error);
        setWsEnabled(false);
      }
    };

    // Connect if sync is enabled and we have a token
    if (syncEnabled && token) {
      console.log('🚀 RuntimeConfig: Initiating WebSocket connection...');
      connectWebSocket();
    } else {
      console.log('📱 RuntimeConfig: Staying in local mode');
    }

    // Cleanup on unmount or dependency change
    return () => {
      console.log('🧹 RuntimeConfig: Cleaning up WebSocket...');
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      
      if (ws) {
        ws.close();
        setWebSocket(null);
        setWsEnabled(false);
      }
    };
  }, [syncEnabled, token]);

  const setSyncEnabled = async (v: boolean) => {
    setSyncEnabledState(v);
    try { await AsyncStorage.setItem(KEY_SYNC, v ? "true" : "false"); } catch {}
  };
  const setWsEnabled = async (v: boolean) => {
    setWsEnabledState(v);
    try { await AsyncStorage.setItem(KEY_WS, v ? "true" : "false"); } catch {}
  };

  const value = useMemo<RuntimeConfig>(() => ({
    hydrated,
    syncEnabled,
    wsEnabled,
    webSocket,
    mode: syncEnabled ? "sync" : "local",
    setSyncEnabled,
    setWsEnabled,
  }), [hydrated, syncEnabled, wsEnabled, webSocket]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRuntimeConfig() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRuntimeConfig must be used within RuntimeConfigProvider");
  return ctx;
}
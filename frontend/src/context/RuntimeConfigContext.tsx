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
  const { token } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [syncEnabled, setSyncEnabledState] = useState(false);
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
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000; // 3 seconds

    const connectWebSocket = () => {
      if (!syncEnabled || !token) {
        setWebSocket(null);
        setWsEnabled(false);
        return;
      }

      try {
        const wsUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL?.replace('http', 'ws')}/api/ws?token=${token}`;
        console.log('🔌 Connecting WebSocket:', wsUrl.replace(token, 'TOKEN_HIDDEN'));
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          setWebSocket(ws);
          setWsEnabled(true);
          reconnectAttempts = 0; // Reset attempts on successful connection
          
          // Start heartbeat to keep connection alive
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          heartbeatTimer = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
              console.log('💓 Heartbeat sent');
            }
          }, 30000); // Send heartbeat every 30 seconds
        };
        
        ws.onclose = () => {
          console.log('🔌 WebSocket closed');
          setWebSocket(null);
          setWsEnabled(false);
          
          if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
          }
          
          // Auto-reconnect if sync mode is still enabled and we haven't exceeded attempts
          if (syncEnabled && token && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
            
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connectWebSocket, reconnectDelay);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.log('❌ Max reconnection attempts reached');
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle pong response to keep connection alive
            if (data.type === 'pong') {
              console.log('💓 Heartbeat pong received');
              return;
            }
            
            // Handle other WebSocket messages
            console.log('📨 WebSocket message received:', data.type);
          } catch (error) {
            console.error('❌ WebSocket message parsing error:', error);
          }
        };
        
      } catch (error) {
        console.error('❌ WebSocket connection error:', error);
        setWsEnabled(false);
      }
    };

    // Connect if sync is enabled and we have a token
    if (syncEnabled && token) {
      connectWebSocket();
    }

    // Cleanup on unmount or dependency change
    return () => {
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

  const value = useMemo(() => ({ hydrated, syncEnabled, wsEnabled, webSocket, setSyncEnabled, setWsEnabled }), [hydrated, syncEnabled, wsEnabled, webSocket]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRuntimeConfig() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRuntimeConfig must be used within RuntimeConfigProvider");
  return ctx;
}
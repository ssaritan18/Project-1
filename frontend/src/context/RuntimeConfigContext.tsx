import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthToken } from "../utils/authTokenHelper";

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

  // WebSocket management with proper cleanup
  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let pollingTimer: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const handleAuthStateChange = async (event: any) => {
      console.log('🔄 WebSocket: Auth state change detected, reconnecting...');
      setTimeout(async () => {
        if (!isMounted) return;
        const newToken = await getAuthToken();
        if (syncEnabled && newToken) {
          connectWebSocket();
        }
      }, 1000);
    };

    const handleTokenRefresh = async (event: any) => {
      console.log('🔄 WebSocket: Token refreshed, reconnecting...');
      setTimeout(async () => {
        if (!isMounted) return;
        const newToken = await getAuthToken();
        if (syncEnabled && newToken) {
          connectWebSocket();
        }
      }, 500);
    };

    const connectWebSocket = async () => {
      if (!isMounted) return;
      
      const storedToken = await getAuthToken();
      if (!syncEnabled) {
        console.log("🔌 RuntimeConfig: Sync disabled, skipping WebSocket");
        setWebSocket(null);
        setWsEnabled(false);
        return;
      }
      
      if (!storedToken) {
        console.log("🔌 RuntimeConfig: No token available for WebSocket");
        setWebSocket(null);
        setWsEnabled(false);
        return;
      }
      
      try {
        const cleanToken = typeof storedToken === 'string' 
          ? storedToken.replace(/^["']|["']$/g, '').trim()
          : storedToken;
        
        const encodedToken = encodeURIComponent(cleanToken);
        const wsUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL?.replace('http', 'ws')}/api/ws?token=${encodedToken}`;
        console.log('🔌 RuntimeConfig: Connecting WebSocket:', wsUrl.replace(encodedToken, 'TOKEN_HIDDEN'));
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('✅ RuntimeConfig: WebSocket connected successfully');
          setWebSocket(ws);
          setWsEnabled(true);
          reconnectAttempts = 0;
          
          // Start heartbeat
          heartbeatTimer = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              console.log('💓 RuntimeConfig: Heartbeat sent');
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'pong') {
              console.log('💓 RuntimeConfig: Heartbeat pong received');
              return;
            }
            
            if (data.type === 'connectionEstablished') {
              console.log('✅ RuntimeConfig: WebSocket connection established');
              setWsEnabled(true);
              reconnectAttempts = 0;
            }
            
            console.log('📨 RuntimeConfig: WebSocket message received:', data.type);
            
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('websocketMessage', {
                detail: data
              }));
            }
            
          } catch (error) {
            console.error('❌ RuntimeConfig: WebSocket message parsing error:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.log('🔌 RuntimeConfig: WebSocket error - switching to polling mode');
          // Don't log the actual error to avoid console spam
          setWsEnabled(false);
          
          // Start polling mode as fallback immediately
          if (!pollingTimer) {
            console.log('🔄 Starting polling fallback for preview environment');
            startPollingMode();
          }
        };
        
        ws.onclose = () => {
          console.log('🔌 RuntimeConfig: WebSocket closed');
          setWebSocket(null);
          setWsEnabled(false);
          
          if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
          }
          
          if (isMounted && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`🔄 RuntimeConfig: Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
            reconnectTimer = setTimeout(() => {
              if (isMounted) connectWebSocket();
            }, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000));
          }
        };
        
      } catch (error) {
        console.error('❌ RuntimeConfig: WebSocket connection error:', error);
      }
    };

    // Initialize connection
    const initializeConnection = async () => {
      try {
        const token = await getAuthToken();
        if (syncEnabled && token) {
          console.log('🚀 RuntimeConfig: Initiating WebSocket connection...');
          await connectWebSocket();
        } else {
          console.log('📱 RuntimeConfig: Staying in local mode');
        }
      } catch (error) {
        console.error('❌ Error initializing connection:', error);
      }
    };
    
    initializeConnection();

    // Add event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('authStateChanged', handleAuthStateChange);
      window.addEventListener('tokenRefreshed', handleTokenRefresh);
    }

    // Cleanup function
    return () => {
      isMounted = false;
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('authStateChanged', handleAuthStateChange);
        window.removeEventListener('tokenRefresh', handleTokenRefresh);
      }
      
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (pollingTimer) clearInterval(pollingTimer);
      
      if (ws) {
        ws.close();
        setWebSocket(null);
        setWsEnabled(false);
      }
    };
  }, [syncEnabled]);

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
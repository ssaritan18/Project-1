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

  // WebSocket management
  useEffect(() => {
    (async () => {
      const storedToken = await getAuthToken();
      console.log("🔌 RuntimeConfig: WebSocket effect triggered", { syncEnabled, token: !!storedToken });
      
      // Listen for auth state changes
      const handleAuthStateChange = (event: any) => {
        console.log('🔄 WebSocket: Auth state change detected, reconnecting...');
        // Trigger reconnection after a short delay to allow token to be stored
        setTimeout(async () => {
          const newToken = await getAuthToken();
          if (syncEnabled && newToken) {
            await connectWebSocket();
          }
        }, 1000);
      };
    
    // Listen for token refresh events
    const handleTokenRefresh = (event: any) => {
      console.log('🔄 WebSocket: Token refresh detected, reconnecting with new token...');
      const { token } = event.detail;
      if (syncEnabled && token) {
        // Close existing connection and reconnect with new token
        if (ws) {
          ws.close();
        }
        setTimeout(async () => {
          await connectWebSocket();
        }, 500);
      }
    };
    
    window.addEventListener('authStateChanged', handleAuthStateChange);
    window.addEventListener('tokenRefreshed', handleTokenRefresh);
    
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let pollingTimer: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000; // 3 seconds

    const startPollingFallback = () => {
      console.log('🔄 Starting polling fallback for preview environment');
      
      const pollForUpdates = async () => {
        try {
          const storedToken = getAuthToken();
          if (!storedToken) return;
          
          // Poll for updates every 10 seconds
          const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/poll-updates`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.updates && data.updates.length > 0) {
              console.log('📨 Polling: Updates received:', data.updates.length);
              // Process updates similar to WebSocket messages
              data.updates.forEach((update: any) => {
                console.log('📨 Polling: Processing update:', update.type);
              });
            }
          }
        } catch (error) {
          console.error('❌ Polling error:', error);
        }
      };
      
      // Start polling every 10 seconds
      if (pollingTimer) clearInterval(pollingTimer);
      pollingTimer = setInterval(pollForUpdates, 10000);
      
      // Initial poll
      pollForUpdates();
    };

    const connectWebSocket = async () => {
      const storedToken = await getAuthToken();
      if (!syncEnabled) {
        console.log("🔌 RuntimeConfig: Sync disabled, skipping WebSocket");
        setWebSocket(null);
        setWsEnabled(false);
        return;
      }
      
      if (!storedToken) {
        console.log("🔌 RuntimeConfig: No token available, will retry WebSocket connection");
        setWebSocket(null);
        setWsEnabled(false);
        // Retry connection after 2 seconds if no token (user might be logging in)
        setTimeout(async () => {
          const retryToken = await getAuthToken();
          if (retryToken) {
            console.log("🔄 Retrying WebSocket connection with token");
            connectWebSocket();
          }
        }, 2000);
        return;
      }
      
      console.log("🔑 WebSocket connecting with token:", storedToken ? 'Available' : 'Missing');

      try {
        // Clean token - remove any quotes if they exist
        const cleanToken = storedToken.replace(/^["']|["']$/g, '');
        const wsUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL?.replace('http', 'ws')}/api/ws?token=${cleanToken}`;
        console.log('🔌 RuntimeConfig: Connecting WebSocket:', wsUrl.replace(cleanToken, 'TOKEN_HIDDEN'));
        
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
          if (syncEnabled && getAuthToken() && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`🔄 RuntimeConfig: Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
            
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connectWebSocket, reconnectDelay);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.log('❌ RuntimeConfig: Max reconnection attempts reached');
          }
        };
        
        ws.onerror = (error) => {
          console.error('🔌 RuntimeConfig: WebSocket error:', error);
          setWebSocket(null);
          setWsEnabled(false);
          
          // Check if we're in preview environment (proxy issues)
          const isPreviewEnv = window.location.hostname.includes('preview.emergentagent.com');
          
          if (isPreviewEnv) {
            console.log('🔄 Preview environment detected - falling back to polling mode');
            // Don't reconnect WebSocket in preview, use polling fallback
            startPollingFallback();
          } else {
            // Production - try to reconnect WebSocket
            reconnectTimer = setTimeout(async () => {
              console.log('🔄 RuntimeConfig: Attempting to reconnect WebSocket...');
              await connectWebSocket();
            }, 5000);
          }
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
    if (syncEnabled && getAuthToken()) {
      console.log('🚀 RuntimeConfig: Initiating WebSocket connection...');
      connectWebSocket();
    } else {
      console.log('📱 RuntimeConfig: Staying in local mode');
    }

    // Cleanup on unmount or dependency change
    return () => {
      console.log('🧹 RuntimeConfig: Cleaning up WebSocket...');
      
      window.removeEventListener('authStateChanged', handleAuthStateChange);
      window.removeEventListener('tokenRefreshed', handleTokenRefresh);
      
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
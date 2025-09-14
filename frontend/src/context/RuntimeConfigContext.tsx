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

    const handleTokenUpdated = async (event: any) => {
      console.log('🔄 WebSocket: Token updated, reconnecting...');
      setTimeout(async () => {
        if (!isMounted) return;
        const newToken = await getAuthToken();
        if (syncEnabled && newToken) {
          connectWebSocket();
        }
      }, 500);
    };

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

    const startPollingMode = () => {
      if (pollingTimer) {
        clearInterval(pollingTimer);
      }
      
      console.log('🔄 Starting enhanced polling fallback for preview environment');
      pollingTimer = setInterval(async () => {
        try {
          const token = await getAuthToken();
          
          if (token) {
            const cleanToken = token.replace(/^["']|["']$/g, '').trim();
            const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/poll-updates`, {
              headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log('📡 Polling data received - friend requests:', data.updates?.friends?.new_requests || 0);
              
              // Broadcast polling data as WebSocket message for other contexts
              if (typeof window !== 'undefined') {
                // Dispatch friend list updates
                window.dispatchEvent(new CustomEvent('websocketMessage', {
                  detail: {
                    type: 'friendListUpdate',
                    data: data.updates?.friends || {}
                  }
                }));
                
                // Dispatch general polling update
                window.dispatchEvent(new CustomEvent('websocketMessage', {
                  detail: {
                    type: 'pollingUpdate',
                    data: data.updates
                  }
                }));
              }
            }
          }
        } catch (pollingError) {
          // Silently handle polling errors to avoid console spam
          console.log('📡 Polling temporarily unavailable');
        }
      }, 15000); // Poll every 15 seconds to avoid rate limits
    };

    const connectWebSocket = async () => {
      if (!isMounted) return;
      
      // Always get fresh token to avoid closure issues
      const currentToken = await getAuthToken();
      if (!syncEnabled) {
        console.log("🔌 RuntimeConfig: Sync disabled, skipping WebSocket");
        setWebSocket(null);
        setWsEnabled(false);
        return;
      }
      
      if (!currentToken) {
        console.log("🔌 RuntimeConfig: No token available for WebSocket");
        setWebSocket(null);
        setWsEnabled(false);
        return;
      }
      
      try {
        console.log('🔍 Raw token from getAuthToken:', JSON.stringify(currentToken));
        
        // Aggressive token cleaning - remove all possible quote combinations
        let cleanToken = currentToken || '';
        if (typeof cleanToken !== 'string') {
          cleanToken = String(cleanToken);
        }
        
        // Remove all types of quotes and whitespace
        cleanToken = cleanToken
          .replace(/^["']|["']$/g, '')  // Remove leading/trailing quotes
          .replace(/\\"/g, '"')         // Unescape quotes  
          .replace(/^"|"$/g, '')        // Remove any remaining quotes
          .replace(/^'|'$/g, '')        // Remove single quotes
          .trim();                      // Remove whitespace
        
        console.log('🔍 Aggressively cleaned token:', JSON.stringify(cleanToken));
        console.log('🔍 Token starts with:', cleanToken.substring(0, 10));
        console.log('🔍 Token ends with:', cleanToken.substring(cleanToken.length - 10));
        
        // Don't encode the token - pass it directly
        const wsUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL?.replace('http', 'ws')}/api/ws?token=${cleanToken}`;
        console.log('🔌 RuntimeConfig: Connecting WebSocket with clean URL');
        
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
          setWsEnabled(false);
          
          // Start polling mode as fallback immediately
          startPollingMode();
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
          } else {
            // If we've exhausted reconnect attempts, start polling
            startPollingMode();
          }
        };
        
      } catch (error) {
        console.error('❌ RuntimeConfig: WebSocket connection error:', error);
        // Fallback to polling on any connection error
        startPollingMode();
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
      window.addEventListener('tokenUpdated', handleTokenUpdated);
    }

    // Cleanup function
    return () => {
      isMounted = false;
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('authStateChanged', handleAuthStateChange);
        window.removeEventListener('tokenUpdated', handleTokenUpdated);
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
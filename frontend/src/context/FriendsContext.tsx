import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PERSIST_ENABLED, KEYS } from "../config";
import { loadJSON, saveJSON } from "../utils/persist";
import { api } from "../lib/api";
import { useRuntimeConfig } from "./RuntimeConfigContext";
import { useAuth } from "./AuthContext";
import { Alert } from "react-native";

function uid() { return Math.random().toString(36).slice(2); }

export type Friend = { id: string; name: string; email?: string };
export type FriendRequest = { id: string; from: string; note?: string };
export type Post = { id: string; author: string; text: string; ts: number; reactions: Record<string, number> };

type FriendsContextType = {
  friends: Friend[];
  requests: FriendRequest[];
  posts: Post[];
  presence: Record<string, boolean>;
  lastNotification: string | null;
  wsConnectionStatus: string;
  clearNotification: () => void;
  refresh: () => Promise<void>;
  sendRequest: (email: string, note?: string) => Promise<void>;
  acceptRequest: (id: string) => Promise<void>;
  rejectRequest: (id: string) => Promise<void>;
  addPost: (text: string) => void;
  reactPost: (postId: string, type: "like" | "clap" | "star" | "heart") => void;
};

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const { syncEnabled, wsEnabled } = useRuntimeConfig();
  const { token } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [lastNotification, setLastNotification] = useState<string | null>(null);
  const [wsConnectionStatus, setWsConnectionStatus] = useState<string>("Disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<any>(null);

  const clearNotification = () => setLastNotification(null);

  // Real-time WebSocket event handling
  useEffect(() => {
    const handleWebSocketMessage = (event: any) => {
      const data = event.detail;
      console.log('🎯 FriendsContext: Received WebSocket event:', data);
      
      switch (data.type) {
        case 'friendRequestReceived':
          // New friend request received
          const newRequest = {
            id: data.data.request_id,
            from: data.data.sender_name,
            email: data.data.sender_email,
            sender_id: data.data.sender_id,
            timestamp: data.data.timestamp
          };
          
          setRequests(prev => [newRequest, ...prev]);
          setLastNotification(`New friend request from ${data.data.sender_name}`);
          console.log('👫 New friend request added to state:', newRequest);
          break;
          
        case 'friendRequestAccepted':
          // Your friend request was accepted
          const newFriend = {
            id: data.data.friend_id,
            name: data.data.friend_name,
            email: data.data.friend_email
          };
          
          setFriends(prev => [...prev, newFriend]);
          setLastNotification(`${data.data.friend_name} accepted your friend request!`);
          console.log('✅ Friend request accepted, friend added:', newFriend);
          break;
          
        case 'friendListUpdate':
          // Friend list updated (you accepted someone's request)
          const updatedFriend = {
            id: data.data.friend_id,
            name: data.data.friend_name,
            email: data.data.friend_email
          };
          
          setFriends(prev => [...prev, updatedFriend]);
          console.log('📝 Friend list updated:', updatedFriend);
          break;
          
        case 'messageReceived':
          // New chat message received - could trigger notification
          setLastNotification(`New message from ${data.data.sender_name}`);
          console.log('💬 Message received notification:', data.data);
          break;
          
        case 'connectionEstablished':
          setWsConnectionStatus('Connected');
          console.log('🔌 WebSocket connection established');
          break;
          
        default:
          console.log('🔍 Unknown WebSocket event type:', data.type);
      }
    };

    // Listen for WebSocket events from RuntimeConfig
    if (typeof window !== 'undefined') {
      window.addEventListener('websocketMessage', handleWebSocketMessage);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('websocketMessage', handleWebSocketMessage);
      }
    };
  }, []);

  const connectWS = () => {
    console.log("🔧 connectWS called with:", { syncEnabled, wsEnabled, hasToken: !!token });
    
    if (!syncEnabled) {
      console.log("🔌 WebSocket not connecting: syncEnabled is false");
      setWsConnectionStatus("Sync disabled");
      return;
    }
    
    if (!wsEnabled) {
      console.log("🔌 WebSocket not connecting: wsEnabled is false");
      setWsConnectionStatus("WebSocket disabled");
      return;
    }
    
    if (!token) {
      console.log("🔌 WebSocket not connecting: no token");
      setWsConnectionStatus("No token");
      return;
    }

    try {
      const base = process.env.EXPO_PUBLIC_BACKEND_URL || "";
      console.log("🔧 EXPO_PUBLIC_BACKEND_URL:", base);
      
      const wsProto = base.startsWith("https") ? "wss" : "ws";
      const url = base.replace(/^https?/, wsProto) + "/api/ws?token=" + encodeURIComponent(token);
      console.log("🔌 Attempting WebSocket connection to:", url.replace(token, "***TOKEN***"));
      setWsConnectionStatus("Connecting...");
      
      const sock = new WebSocket(url);
      sock.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        setWsConnectionStatus("Connected ✅");
        showDebugAlert("WebSocket Connected! 🎉");
      };
      sock.onclose = (event) => {
        console.log("❌ WebSocket closed:", { code: event.code, reason: event.reason });
        setWsConnectionStatus(`Closed (${event.code})`);
        wsRef.current = null;
        
        // Auto-reconnect after 3 seconds if not normal closure
        if (event.code !== 1000) {
          console.log("🔄 Auto-reconnecting WebSocket in 3s...");
          setTimeout(() => {
            if (syncEnabled && wsEnabled && token) {
              console.log("🔄 Attempting WebSocket reconnection...");
              connectWS();
            }
          }, 3000);
        }
      };
      sock.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setWsConnectionStatus("Error ❌");
        showDebugAlert("WebSocket Error! ❌");
      };
      sock.onmessage = (ev) => {
        console.log("📨 WebSocket message received:", ev.data);
        try {
          const data = JSON.parse(ev.data);
          console.log("📨 Parsed WebSocket data:", data);
          if (data.type === "friend_request:incoming") {
            const from = data.from?.name || data.from?.email || "Friend";
            setRequests((prev) => [{ id: data.request_id, from }, ...prev]);
            setLastNotification(`Yeni arkadaş isteği: ${from}`);
            showDebugAlert(`Friend Request Received! From: ${from} 📩`);
            console.log("✅ Friend request processed:", { from, requestId: data.request_id });
          } else if (data.type === "friend_request:accepted") {
            const by = data.by?.name || data.by?.email || "Friend";
            setLastNotification(`İsteğiniz kabul edildi: ${by}`);
            showDebugAlert(`Request Accepted by: ${by} ✅`);
            refresh();
            console.log("✅ Friend request accepted processed:", { by });
          } else if (data.type === "friend_request:rejected") {
            const by = data.by?.name || data.by?.email || "Friend";
            setLastNotification(`İsteğiniz reddedildi: ${by}`);
            showDebugAlert(`Request Rejected by: ${by} ❌`);
            console.log("✅ Friend request rejected processed:", { by });
          } else if (data.type === "presence:update") {
            setPresence((prev) => ({ ...prev, [data.user_id]: !!data.online }));
            console.log("✅ Presence update processed:", { userId: data.user_id, online: data.online });
          } else if (data.type === "presence:bulk") {
            const map = data.online || {};
            setPresence(map);
            console.log("✅ Bulk presence processed:", map);
          } else if (data.type === "friends:list:update") {
            console.log("📱 MOBILE: friends:list:update received - refreshing...");
            refresh();
            console.log("📱 MOBILE: refresh completed");
          } else {
            console.log("🤷 Unknown WebSocket message type:", data.type);
          }
        } catch (error) {
          console.error("❌ Failed to parse WebSocket message:", error, ev.data);
        }
      };
      wsRef.current = sock;
    } catch (error) {
      console.error("❌ Failed to create WebSocket connection:", error);
      setWsConnectionStatus("Failed ❌");
      showDebugAlert("Failed to create WebSocket! ❌");
    }
  };

  React.useEffect(() => {
    // Global debug access for console
    if (typeof window !== 'undefined') {
      (window as any).friendsDebug = { friends, requests, posts, presence };
      console.log("🔍 Friends Debug Updated:", { 
        friendsCount: friends?.length || 0, 
        friends: friends?.slice(0, 2) || [],
        friendsType: typeof friends,
        friendsIsArray: Array.isArray(friends)
      });
    }
  }, [friends, requests, posts, presence]);

  // Fallback polling when WS not available
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (syncEnabled && token) {
      pollRef.current = setInterval(() => {
        // If WS is off or disconnected, poll less frequently to avoid rate limits
        if (!wsEnabled || !wsRef.current) {
          console.log("📡 Polling friends data...");
          refresh();
        }
      }, 30000); // Changed from 6s to 30s to prevent rate limiting
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [syncEnabled, token, wsEnabled]);

  useEffect(() => {
    // Debounce WebSocket connections to prevent rapid reconnects
    const timeoutId = setTimeout(() => {
      if (wsRef.current) { 
        try { wsRef.current.close(); } catch {} 
        wsRef.current = null; 
      }
      connectWS();
    }, 500);

    return () => { 
      clearTimeout(timeoutId);
      if (wsRef.current) { 
        try { wsRef.current.close(); } catch {} 
        wsRef.current = null; 
      } 
    };
  }, [syncEnabled, wsEnabled, token]);

  const refresh = async () => {
    if (syncEnabled && token) {
      try {
        const fl = await api.get("/friends/list");
        const serverFriends = (fl.data.friends || []).map((f: any) => ({ id: f._id, name: f.name || "Friend", email: f.email }));
        setFriends(serverFriends);
        try {
          const rq = await api.get("/friends/requests");
          const serverReqs = (rq.data.requests || []).map((r: any) => ({ id: r._id, from: r.from_name || r.from_email || "Friend" }));
          setRequests(serverReqs);
        } catch {}
        return;
      } catch (e) {
        // fallthrough to local
      }
    }
    if (!hydrated && PERSIST_ENABLED) {
      const f = await loadJSON<Friend[] | null>(KEYS.friends, null);
      const r = await loadJSON<FriendRequest[] | null>(KEYS.requests, null);
      const p = await loadJSON<Post[] | null>(KEYS.posts, null);
      if (f && Array.isArray(f) && f.length > 0) setFriends(f);
      if (r && Array.isArray(r) && r.length > 0) setRequests(r);
      if (p && Array.isArray(p) && p.length > 0) setPosts(p);
      setHydrated(true);
    }
  };

  // Initial load only - prevent infinite refresh loop
  useEffect(() => { 
    console.log("🔄 FriendsContext: Initial refresh called");
    refresh(); 
  }, []); // Empty dependency array - only run once

  useEffect(() => { if (PERSIST_ENABLED && !syncEnabled && hydrated) saveJSON(KEYS.friends, friends); }, [friends, hydrated, syncEnabled]);
  useEffect(() => { if (PERSIST_ENABLED && !syncEnabled && hydrated) saveJSON(KEYS.requests, requests); }, [requests, hydrated, syncEnabled]);
  useEffect(() => { if (PERSIST_ENABLED && !syncEnabled && hydrated) saveJSON(KEYS.posts, posts); }, [posts, hydrated, syncEnabled]);

  const sendRequest = async (email: string, note?: string) => {
    console.log("📧 Sending friend request:", { email, syncEnabled, hasToken: !!token });
    
    if (syncEnabled && token) {
      try {
        console.log("🌐 Making API call to /friends/request");
        const response = await api.post("/friends/request", { email }); // Updated to new format
        console.log("✅ API call successful:", response.data);
        
        // Don't need to refresh immediately - real-time events will update the UI
        console.log("✅ Friend request sent successfully via API - waiting for real-time updates");
        return;
      } catch (error) {
        console.error("❌ API friend request failed:", error);
        throw new Error(`Failed to send friend request: ${error.response?.data?.detail || error.message || 'Network error'}`);
      }
    }
    
    console.log("📱 Adding friend request locally");
    setRequests((prev) => [...prev, { id: uid(), from: email, note }]);
    console.log("✅ Friend request added locally");
  };

  const acceptRequest = async (id: string) => {
    if (syncEnabled && token) {
      try {
        await api.post("/friends/accept", { request_id: id });
        // Remove from local requests immediately
        setRequests((prev) => prev.filter((r) => r.id !== id));
        // Refresh friends list
        await refresh();
        setLastNotification("Arkadaş isteği kabul edildi");
      } catch (e) {
        console.error("❌ Accept request failed:", e);
      }
      return;
    }
    // Local-only logic
    const req = requests.find((r) => r.id === id);
    if (req) setFriends((prev) => [...prev, { id: uid(), name: req.from }]);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const rejectRequest = async (id: string) => {
    if (syncEnabled && token) {
      try {
        await api.post("/friends/reject", { request_id: id });
        // Remove from local requests immediately
        setRequests((prev) => prev.filter((r) => r.id !== id));
        setLastNotification("Arkadaş isteği reddedildi");
      } catch (e) {
        console.error("❌ Reject request failed:", e);
      }
      return;
    }
    // Local-only logic
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const addPost = (text: string) => setPosts((prev) => [{ id: uid(), author: "You", text, ts: Date.now(), reactions: {} }, ...prev]);
  const reactPost = (postId: string, type: "like" | "clap" | "star" | "heart") => setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reactions: { ...p.reactions, [type]: (p.reactions[type] || 0) + 1 } } : p)));

  const value = useMemo<FriendsContextType>(() => {
    // Global debug access
    if (typeof window !== 'undefined') {
      (window as any).friendsDebug = { friends, requests, posts, presence };
    }
    return { 
      friends: friends || [], 
      requests: requests || [], 
      posts: posts || [], 
      presence, 
      lastNotification, 
      wsConnectionStatus, 
      clearNotification, 
      refresh, 
      sendRequest, 
      acceptRequest, 
      rejectRequest, 
      addPost, 
      reactPost 
    };
  }, [friends, requests, posts, presence, lastNotification, wsConnectionStatus, syncEnabled, token]);

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends() { const ctx = useContext(FriendsContext); if (!ctx) throw new Error("useFriends must be used within FriendsProvider"); return ctx; }
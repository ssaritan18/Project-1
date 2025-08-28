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

  const showDebugAlert = (message: string) => {
    Alert.alert("🐛 Debug", message, [{ text: "OK" }]);
  };

  const connectWS = () => {
    if (!syncEnabled || !wsEnabled || !token) {
      console.log("🔌 WebSocket not connecting:", { syncEnabled, wsEnabled, hasToken: !!token });
      setWsConnectionStatus(`Not connecting: sync=${syncEnabled}, ws=${wsEnabled}, token=${!!token}`);
      return;
    }
    try {
      const base = process.env.EXPO_PUBLIC_BACKEND_URL || "";
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
            refresh();
            console.log("✅ Friends list update processed");
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

  // Fallback polling when WS not available
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (syncEnabled && token) {
      pollRef.current = setInterval(() => {
        // If WS is off or disconnected, poll
        if (!wsEnabled || !wsRef.current) {
          refresh();
        }
      }, 6000);
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [syncEnabled, token, wsEnabled]);

  useEffect(() => {
    if (wsRef.current) { try { wsRef.current.close(); } catch {} wsRef.current = null; }
    connectWS();
    return () => { if (wsRef.current) { try { wsRef.current.close(); } catch {} wsRef.current = null; } };
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
      if (f && f.length) setFriends(f);
      if (r && r.length) setRequests(r);
      if (p && p.length) setPosts(p);
      setHydrated(true);
    }
  };

  useEffect(() => { refresh(); }, [syncEnabled, token]);

  useEffect(() => { if (PERSIST_ENABLED && !syncEnabled && hydrated) saveJSON(KEYS.friends, friends); }, [friends, hydrated, syncEnabled]);
  useEffect(() => { if (PERSIST_ENABLED && !syncEnabled && hydrated) saveJSON(KEYS.requests, requests); }, [requests, hydrated, syncEnabled]);
  useEffect(() => { if (PERSIST_ENABLED && !syncEnabled && hydrated) saveJSON(KEYS.posts, posts); }, [posts, hydrated, syncEnabled]);

  const sendRequest = async (email: string, note?: string) => {
    if (syncEnabled && token) {
      await api.post("/friends/request", { to_email: email });
      await refresh();
      return;
    }
    setRequests((prev) => [...prev, { id: uid(), from: email, note }]);
  };

  const acceptRequest = async (id: string) => {
    if (syncEnabled && token) {
      await api.post("/friends/accept", { request_id: id });
      await refresh();
      return;
    }
    const req = requests.find((r) => r.id === id);
    if (req) setFriends((prev) => [...prev, { id: uid(), name: req.from }]);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const rejectRequest = async (id: string) => {
    if (syncEnabled && token) {
      await api.post("/friends/reject", { request_id: id });
      await refresh();
      return;
    }
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const addPost = (text: string) => setPosts((prev) => [{ id: uid(), author: "You", text, ts: Date.now(), reactions: {} }, ...prev]);
  const reactPost = (postId: string, type: "like" | "clap" | "star" | "heart") => setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reactions: { ...p.reactions, [type]: (p.reactions[type] || 0) + 1 } } : p)));

  const value = useMemo<FriendsContextType>(() => ({ friends, requests, posts, presence, lastNotification, wsConnectionStatus, clearNotification, refresh, sendRequest, acceptRequest, rejectRequest, addPost, reactPost }), [friends, requests, posts, presence, lastNotification, wsConnectionStatus, syncEnabled, token]);

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends() { const ctx = useContext(FriendsContext); if (!ctx) throw new Error("useFriends must be used within FriendsProvider"); return ctx; }
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { PERSIST_ENABLED, KEYS } from "../config";
import { loadJSON, saveJSON } from "../utils/persist";
import { api } from "../lib/api";
import { useRuntimeConfig } from "./RuntimeConfigContext";
import { useAuth } from "./AuthContext";

function uid() { return Math.random().toString(36).slice(2); }

export type Friend = { id: string; name: string; email?: string };
export type FriendRequest = { id: string; from: string; note?: string };
export type Post = { id: string; author: string; text: string; ts: number; reactions: Record<string, number> };

type FriendsContextType = {
  friends: Friend[];
  requests: FriendRequest[];
  posts: Post[];
  refresh: () => Promise<void>;
  sendRequest: (email: string, note?: string) => Promise<void>;
  acceptRequest: (id: string) => Promise<void>;
  rejectRequest: (id: string) => Promise<void>;
  addPost: (text: string) => void;
  reactPost: (postId: string, type: "like" | "clap" | "star" | "heart") => void;
};

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const { syncEnabled } = useRuntimeConfig();
  const { token } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

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

  const value = useMemo<FriendsContextType>(() => ({ friends, requests, posts, refresh, sendRequest, acceptRequest, rejectRequest, addPost, reactPost }), [friends, requests, posts, syncEnabled, token]);

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends() { const ctx = useContext(FriendsContext); if (!ctx) throw new Error("useFriends must be used within FriendsProvider"); return ctx; }
import React, { createContext, useContext, useMemo, useState } from "react";

function uid() { return Math.random().toString(36).slice(2); }

export type Friend = { id: string; name: string };
export type FriendRequest = { id: string; from: string; note?: string };
export type Post = { id: string; author: string; text: string; ts: number; reactions: Record<string, number> };

type FriendsContextType = {
  friends: Friend[];
  requests: FriendRequest[];
  posts: Post[];
  sendRequest: (name: string, note?: string) => void;
  acceptRequest: (id: string) => void;
  addPost: (text: string) => void;
  reactPost: (postId: string, type: "like" | "clap" | "star" | "heart") => void;
};

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const [friends, setFriends] = useState<Friend[]>([
    { id: uid(), name: "Ava" },
    { id: uid(), name: "Mia" },
  ]);
  const [requests, setRequests] = useState<FriendRequest[]>([
    { id: uid(), from: "Noah", note: "Let's keep each other accountable!" },
  ]);
  const [posts, setPosts] = useState<Post[]>([
    { id: uid(), author: "Ava", text: "Tried 25-minute sprints today, felt great!", ts: Date.now() - 3600000, reactions: { like: 2, heart: 1 } },
  ]);

  const value = useMemo<FriendsContextType>(() => ({
    friends, requests, posts,
    sendRequest: (name, note) => setRequests((prev) => [...prev, { id: uid(), from: name, note }]),
    acceptRequest: (id) => {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      // In this MVP, request.from becomes a friend
      const req = requests.find((r) => r.id === id);
      if (req) setFriends((prev) => [...prev, { id: uid(), name: req.from }]);
    },
    addPost: (text) => setPosts((prev) => [{ id: uid(), author: "You", text, ts: Date.now(), reactions: {} }, ...prev]),
    reactPost: (postId, type) => setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reactions: { ...p.reactions, [type]: (p.reactions[type] || 0) + 1 } } : p))),
  }), [friends, requests, posts]);

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends() {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error("useFriends must be used within FriendsProvider");
  return ctx;
}
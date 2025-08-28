import React, { createContext, useContext, useMemo, useState } from "react";

export type ReactionType = "like" | "heart" | "clap" | "star";

export type Message = {
  id: string;
  chatId: string;
  author: string; // "me" or a name
  type: "text" | "voice";
  text?: string;
  durationSec?: number; // for voice mock
  ts: number;
  reactions?: Record<ReactionType, number>;
};

export type Chat = {
  id: string;
  title: string;
  members: string[]; // names only for MVP
  unread?: number;
  inviteCode: string;
};

function uid() { return Math.random().toString(36).slice(2); }
function makeCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

type ChatContextType = {
  chats: Chat[];
  messagesByChat: Record<string, Message[]>;
  sendText: (chatId: string, text: string) => void;
  sendVoiceMock: (chatId: string, durationSec?: number) => void;
  markRead: (chatId: string) => void;
  createGroup: (title: string, members: string[]) => string; // returns chatId
  joinByCode: (code: string) => string | null; // returns chatId
  reactMessage: (chatId: string, messageId: string, type: ReactionType) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([
    { id: "adhd_support", title: "ADHD Support Group", members: ["You", "Ava", "Mia", "Noah"], unread: 1, inviteCode: makeCode() },
    { id: "focus_club", title: "Deep Focus Club", members: ["You", "Zoe", "Liam"], unread: 0, inviteCode: makeCode() },
  ]);
  const [messagesByChat, setMessages] = useState<Record<string, Message[]>>({
    adhd_support: [
      { id: uid(), chatId: "adhd_support", author: "Ava", type: "text", text: "Welcome! Share what's working for you today.", ts: Date.now() - 3600000, reactions: { like: 1, heart: 0, clap: 0, star: 0 } },
      { id: uid(), chatId: "adhd_support", author: "me", type: "text", text: "Pomodoro + short walks are helping.", ts: Date.now() - 1800000, reactions: { like: 0, heart: 1, clap: 0, star: 0 } },
    ],
    focus_club: [
      { id: uid(), chatId: "focus_club", author: "Zoe", type: "text", text: "Morning focus room starting in 10m.", ts: Date.now() - 7200000, reactions: { like: 0, heart: 0, clap: 0, star: 1 } },
    ],
  });

  const value = useMemo<ChatContextType>(() => ({
    chats,
    messagesByChat,
    sendText: (chatId, text) => {
      const msg: Message = { id: uid(), chatId, author: "me", type: "text", text, ts: Date.now(), reactions: { like: 0, heart: 0, clap: 0, star: 0 } };
      setMessages((prev) => ({ ...prev, [chatId]: [...(prev[chatId] || []), msg] }));
    },
    sendVoiceMock: (chatId, durationSec = 3) => {
      const msg: Message = { id: uid(), chatId, author: "me", type: "voice", durationSec, ts: Date.now(), reactions: { like: 0, heart: 0, clap: 0, star: 0 } };
      setMessages((prev) => ({ ...prev, [chatId]: [...(prev[chatId] || []), msg] }));
    },
    markRead: (chatId) => setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c))),
    createGroup: (title, members) => {
      const id = uid();
      const code = makeCode();
      setChats((prev) => [{ id, title, members, unread: 0, inviteCode: code }, ...prev]);
      setMessages((prev) => ({ ...prev, [id]: [] }));
      return id;
    },
    joinByCode: (code) => {
      const found = chats.find((c) => c.inviteCode.toUpperCase() === code.toUpperCase());
      if (!found) return null;
      if (!found.members.includes("You")) {
        setChats((prev) => prev.map((c) => (c.id === found.id ? { ...c, members: [...c.members, "You"] } : c)));
      }
      return found.id;
    },
    reactMessage: (chatId, messageId, type) => {
      setMessages((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map((m) => (m.id === messageId ? { ...m, reactions: { ...(m.reactions || {}), [type]: ((m.reactions?.[type] || 0) + 1) as number } } : m)),
      }));
    },
  }), [chats, messagesByChat]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
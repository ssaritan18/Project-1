import React, { createContext, useContext, useMemo, useState } from "react";

export type Message = {
  id: string;
  chatId: string;
  author: string; // "me" or a name
  type: "text" | "voice";
  text?: string;
  durationSec?: number; // for voice mock
  ts: number;
};

export type Chat = {
  id: string;
  title: string;
  members: string[]; // names only for MVP
  unread?: number;
};

function uid() { return Math.random().toString(36).slice(2); }

type ChatContextType = {
  chats: Chat[];
  messagesByChat: Record<string, Message[]>;
  sendText: (chatId: string, text: string) => void;
  sendVoiceMock: (chatId: string, durationSec?: number) => void;
  markRead: (chatId: string) => void;
  createGroup: (title: string, members: string[]) => string; // returns chatId
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([
    { id: "adhd_support", title: "ADHD Support Group", members: ["You", "Ava", "Mia", "Noah"], unread: 1 },
    { id: "focus_club", title: "Deep Focus Club", members: ["You", "Zoe", "Liam"], unread: 0 },
  ]);
  const [messagesByChat, setMessages] = useState<Record<string, Message[]>>({
    adhd_support: [
      { id: uid(), chatId: "adhd_support", author: "Ava", type: "text", text: "Welcome! Share what's working for you today.", ts: Date.now() - 3600000 },
      { id: uid(), chatId: "adhd_support", author: "me", type: "text", text: "Pomodoro + short walks are helping.", ts: Date.now() - 1800000 },
    ],
    focus_club: [
      { id: uid(), chatId: "focus_club", author: "Zoe", type: "text", text: "Morning focus room starting in 10m.", ts: Date.now() - 7200000 },
    ],
  });

  const value = useMemo<ChatContextType>(() => ({
    chats,
    messagesByChat,
    sendText: (chatId, text) => {
      const msg: Message = { id: uid(), chatId, author: "me", type: "text", text, ts: Date.now() };
      setMessages((prev) => ({ ...prev, [chatId]: [...(prev[chatId] || []), msg] }));
    },
    sendVoiceMock: (chatId, durationSec = 3) => {
      const msg: Message = { id: uid(), chatId, author: "me", type: "voice", durationSec, ts: Date.now() };
      setMessages((prev) => ({ ...prev, [chatId]: [...(prev[chatId] || []), msg] }));
    },
    markRead: (chatId) => setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c))),
    createGroup: (title, members) => {
      const id = uid();
      setChats((prev) => [{ id, title, members, unread: 0 }, ...prev]);
      setMessages((prev) => ({ ...prev, [id]: [] }));
      return id;
    },
  }), [chats, messagesByChat]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { PERSIST_ENABLED, KEYS } from "../config";
import { loadJSON, saveJSON } from "../utils/persist";
import { chatAPI } from "../lib/api";
import { useAuth } from "./AuthContext";
import { useRuntimeConfig } from "./RuntimeConfigContext";

export type ReactionType = "like" | "heart" | "clap" | "star";

export type Message = {
  id: string;
  chatId: string;
  author: string; // "me" or a name
  author_id?: string;
  author_name?: string;
  type: "text" | "voice";
  text?: string;
  durationSec?: number; // for voice mock
  ts: number;
  created_at?: string;
  reactions?: Record<ReactionType, number>;
};

export type Chat = {
  id: string;
  _id?: string;
  title: string;
  members: string[]; // names or IDs
  unread?: number;
  inviteCode: string;
  invite_code?: string;
};

function uid() { return Math.random().toString(36).slice(2); }
function makeCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

type ChatContextType = {
  chats: Chat[];
  messagesByChat: Record<string, Message[]>;
  sendText: (chatId: string, text: string) => Promise<void>;
  sendVoiceMock: (chatId: string, durationSec?: number) => void;
  markRead: (chatId: string) => void;
  createGroup: (title: string, members?: string[]) => Promise<string>; // returns chatId
  openDirectChat: (friendId: string) => Promise<string>; // returns chatId
  joinByCode: (code: string) => Promise<string | null>; // returns chatId
  reactMessage: (chatId: string, messageId: string, type: ReactionType) => Promise<void>;
  refresh: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const { mode, webSocket } = useRuntimeConfig();
  
  const [hydrated, setHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Local fallback data
  const [localChats, setLocalChats] = useState<Chat[]>([
    { id: "adhd_support", title: "ADHD Support Group", members: ["You", "Ava", "Mia", "Noah"], unread: 1, inviteCode: makeCode() },
    { id: "focus_club", title: "Deep Focus Club", members: ["You", "Zoe", "Liam"], unread: 0, inviteCode: makeCode() },
  ]);
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({
    adhd_support: [
      { id: uid(), chatId: "adhd_support", author: "Ava", type: "text", text: "Welcome! Share what's working for you today.", ts: Date.now() - 3600000, reactions: { like: 1, heart: 0, clap: 0, star: 0 } },
      { id: uid(), chatId: "adhd_support", author: "me", type: "text", text: "Pomodoro + short walks are helping.", ts: Date.now() - 1800000, reactions: { like: 0, heart: 1, clap: 0, star: 0 } },
    ],
    focus_club: [
      { id: uid(), chatId: "focus_club", author: "Zoe", type: "text", text: "Morning focus room starting in 10m.", ts: Date.now() - 7200000, reactions: { like: 0, heart: 0, clap: 0, star: 1 } },
    ],
  });

  // Backend data
  const [backendChats, setBackendChats] = useState<Chat[]>([]);
  const [backendMessages, setBackendMessages] = useState<Record<string, Message[]>>({});

  console.log("🔍 CHAT CONTEXT RENDER:", {
    mode,
    isAuthenticated, 
    syncEnabled: mode === "sync",
    totalChats: chats.length,
    backendChatsCount: backendChats.length,
    localChatsCount: localChats.length,
    usingBackend: mode === "sync" ? true : false
  });

  // Load persisted data on mount
  useEffect(() => {
    if (!PERSIST_ENABLED) { setHydrated(true); return; }
    (async () => {
      try {
        const storedChats = await loadJSON<Chat[] | null>(KEYS.chats, null);
        const storedMsgs = await loadJSON<Record<string, Message[]> | null>(KEYS.messages, null);
        if (storedChats && Array.isArray(storedChats) && storedChats.length) setLocalChats(storedChats);
        if (storedMsgs && typeof storedMsgs === 'object') setLocalMessages(storedMsgs);
      } catch (error) {
        console.error("❌ Failed to load chat data:", error);
      }
      setHydrated(true);
    })();
  }, []);

  // Persist local data changes
  useEffect(() => {
    if (!PERSIST_ENABLED || !hydrated) return;
    saveJSON(KEYS.chats, localChats);
  }, [localChats, hydrated]);

  useEffect(() => {
    if (!PERSIST_ENABLED || !hydrated) return;
    saveJSON(KEYS.messages, localMessages);
  }, [localMessages, hydrated]);

  // Convert backend chat data to frontend format
  const convertBackendChat = useCallback((backendChat: any): Chat => ({
    id: backendChat._id,
    _id: backendChat._id,
    title: backendChat.title,
    members: backendChat.members || [],
    inviteCode: backendChat.invite_code,
    invite_code: backendChat.invite_code,
    unread: 0 // TODO: Calculate from unread messages
  }), []);

  // Convert backend message data to frontend format
  const convertBackendMessage = useCallback((backendMsg: any): Message => ({
    id: backendMsg._id,
    chatId: backendMsg.chat_id,
    author: backendMsg.author_id === token ? "me" : (backendMsg.author_name || "Unknown"),
    author_id: backendMsg.author_id,
    author_name: backendMsg.author_name,
    type: backendMsg.type || "text",
    text: backendMsg.text,
    ts: new Date(backendMsg.created_at).getTime(),
    created_at: backendMsg.created_at,
    reactions: backendMsg.reactions || { like: 0, heart: 0, clap: 0, star: 0 }
  }), [token]);

  // Fetch chats from backend
  const fetchChats = useCallback(async () => {
    if (mode !== "sync" || !isAuthenticated) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const backendChatsData = await chatAPI.listChats();
      const convertedChats = backendChatsData.map(convertBackendChat);
      setBackendChats(convertedChats);
      
      console.log("✅ Chat: Fetched", convertedChats.length, "chats from backend");
      
    } catch (error) {
      console.error("❌ Chat: Failed to fetch chats:", error);
      setError("Failed to load chats");
    } finally {
      setIsLoading(false);
    }
  }, [mode, isAuthenticated, convertBackendChat]);

  // Fetch messages for a specific chat
  const fetchMessages = useCallback(async (chatId: string) => {
    if (mode !== "sync" || !isAuthenticated) return;

    try {
      const backendMessagesData = await chatAPI.getMessages(chatId);
      const convertedMessages = backendMessagesData.map(convertBackendMessage);
      
      setBackendMessages(prev => ({
        ...prev,
        [chatId]: convertedMessages
      }));
      
      console.log("✅ Chat: Fetched", convertedMessages.length, "messages for chat", chatId);
      
    } catch (error) {
      console.error(`❌ Chat: Failed to fetch messages for chat ${chatId}:`, error);
    }
  }, [mode, isAuthenticated, convertBackendMessage]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await fetchChats();
    // Fetch messages for all chats
    for (const chat of backendChats) {
      await fetchMessages(chat.id);
    }
  }, [fetchChats, fetchMessages, backendChats]);

  // Auto-fetch on mode/auth change
  useEffect(() => {
    if (mode === "sync" && isAuthenticated) {
      refresh();
    }
  }, [mode, isAuthenticated, refresh]);

  // WebSocket message handling
  useEffect(() => {
    if (!webSocket || mode !== "sync") return;

    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("🔥 CHAT WEBSOCKET MESSAGE RECEIVED:", data);
        
        if (data.type === "chat:new_message") {
          const message = convertBackendMessage(data.message);
          console.log("💬 Converting and adding new message:", {
            chatId: message.chatId,
            text: message.text,
            author: message.author,
            messageId: message.id
          });
          
          setBackendMessages(prev => {
            const currentMessages = prev[message.chatId] || [];
            const updatedMessages = [...currentMessages, message];
            console.log("📝 Updated messages for chat", message.chatId, ":", updatedMessages.length, "total messages");
            
            return {
              ...prev,
              [message.chatId]: updatedMessages
            };
          });
          
          console.log("✅ Message added to chat:", message.chatId, "- Total chats with messages:", Object.keys(backendMessages).length);
        }
        
        if (data.type === "chat:message_reaction") {
          console.log("👍 Processing message reaction:", data);
          setBackendMessages(prev => ({
            ...prev,
            [data.chat_id]: (prev[data.chat_id] || []).map(msg => 
              msg.id === data.message_id 
                ? { ...msg, reactions: { ...msg.reactions, [data.reaction_type]: data.new_count } }
                : msg
            )
          }));
        }
        
      } catch (error) {
        console.error("❌ Chat: WebSocket message parsing error:", error);
      }
    };

    console.log("🔌 Setting up WebSocket message listener for chat messages");
    webSocket.addEventListener('message', handleWebSocketMessage);
    
    return () => {
      console.log("🔌 Cleaning up WebSocket message listener");
      webSocket.removeEventListener('message', handleWebSocketMessage);
    };
  }, [webSocket, mode, convertBackendMessage, backendMessages]);

  const value = useMemo<ChatContextType>(() => ({
    chats,
    messagesByChat: mode === "sync" ? backendMessages : localMessages,
    isLoading,
    error,
    refresh,
    
    sendText: async (chatId: string, text: string) => {
      console.log("🚀 SEND TEXT CALLED:", { chatId, text, mode, isAuthenticated });
      
      if (mode === "sync" && isAuthenticated) {
        try {
          console.log("📤 Sending message to backend API...");
          const newMessage = await chatAPI.sendMessage(chatId, text, "text");
          console.log("✅ Backend response received:", newMessage);
          
          const convertedMessage = convertBackendMessage(newMessage);
          console.log("🔄 Converted message:", convertedMessage);
          
          // Add message to local state immediately for responsive UI
          setBackendMessages(prev => {
            const currentMessages = prev[chatId] || [];
            const updatedMessages = [...currentMessages, convertedMessage];
            console.log("📝 Adding message to local state. Chat:", chatId, "Previous count:", currentMessages.length, "New count:", updatedMessages.length);
            
            return {
              ...prev,
              [chatId]: updatedMessages
            };
          });
          
          console.log("✅ Message sent and added locally:", text);
        } catch (error) {
          console.error("❌ Failed to send message:", error);
          throw error;
        }
      } else {
        console.log("📱 Local mode - adding message locally only");
        // Local mode
        const msg: Message = { 
          id: uid(), 
          chatId, 
          author: "me", 
          type: "text", 
          text, 
          ts: Date.now(), 
          reactions: { like: 0, heart: 0, clap: 0, star: 0 } 
        };
        setLocalMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), msg] }));
      }
    },
    
    sendVoiceMock: (chatId: string, durationSec = 3) => {
      const msg: Message = { 
        id: uid(), 
        chatId, 
        author: "me", 
        type: "voice", 
        durationSec, 
        ts: Date.now(), 
        reactions: { like: 0, heart: 0, clap: 0, star: 0 } 
      };
      
      if (mode === "sync") {
        setBackendMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), msg] }));
      } else {
        setLocalMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), msg] }));
      }
    },
    
    markRead: (chatId: string) => {
      if (mode === "sync") {
        setBackendChats(prev => prev.map(c => (c.id === chatId ? { ...c, unread: 0 } : c)));
      } else {
        setLocalChats(prev => prev.map(c => (c.id === chatId ? { ...c, unread: 0 } : c)));
      }
    },
    
    createGroup: async (title: string, members: string[] = []) => {
      if (mode === "sync" && isAuthenticated) {
        try {
          const newChat = await chatAPI.createGroupChat(title);
          const convertedChat = convertBackendChat(newChat);
          
          setBackendChats(prev => [convertedChat, ...prev]);
          setBackendMessages(prev => ({ ...prev, [convertedChat.id]: [] }));
          
          console.log("✅ Chat: Created new GROUP chat:", title);
          return convertedChat.id;
        } catch (error) {
          console.error("❌ Chat: Failed to create group chat:", error);
          throw error;
        }
      } else {
        // Local mode
        const id = uid();
        const code = makeCode();
        const newChat = { id, title, members: ["You", ...members], unread: 0, inviteCode: code };
        
        setLocalChats(prev => [newChat, ...prev]);
        setLocalMessages(prev => ({ ...prev, [id]: [] }));
        
        return id;
      }
    },

    // NEW: Open direct chat with friend
    openDirectChat: async (friendId: string) => {
      console.log("💬 openDirectChat called with friendId:", friendId);
      
      if (mode === "sync" && isAuthenticated) {
        try {
          console.log("📡 Making API call to open direct chat...");
          const chat = await chatAPI.openDirectChat(friendId);
          console.log("✅ Backend returned chat:", chat);
          
          const convertedChat = convertBackendChat(chat);
          console.log("🔄 Converted chat:", convertedChat);
          
          // Add or update chat in list
          setBackendChats(prev => {
            const existing = prev.find(c => c.id === convertedChat.id);
            if (existing) {
              console.log("📝 Chat already exists, keeping existing");
              return prev; // Already exists
            }
            console.log("➕ Adding new chat to list");
            return [convertedChat, ...prev];
          });
          
          // Initialize empty messages for this chat
          setBackendMessages(prev => ({
            ...prev,
            [convertedChat.id]: []
          }));
          
          // Fetch messages for the chat
          console.log("📥 Fetching messages for chat...");
          await fetchMessages(convertedChat.id);
          
          console.log("✅ Chat: Opened direct chat successfully:", convertedChat.id);
          return convertedChat.id;
        } catch (error) {
          console.error("❌ Chat: Failed to open direct chat:", error);
          throw error;
        }
      } else {
        console.log("📱 Local mode - creating local direct chat");
        // Local mode fallback
        const id = `direct_${friendId}`;
        const newChat = { id, title: "Direct Chat", members: ["You", "Friend"], unread: 0, inviteCode: "" };
        
        setLocalChats(prev => {
          const existing = prev.find(c => c.id === id);
          if (existing) return prev;
          return [newChat, ...prev];
        });
        setLocalMessages(prev => ({ ...prev, [id]: [] }));
        
        return id;
      }
    },
    
    joinByCode: async (code: string) => {
      if (mode === "sync" && isAuthenticated) {
        try {
          console.log("🔑 Attempting to join GROUP chat with code:", code);
          const joinedChat = await chatAPI.joinGroupChat(code);
          const convertedChat = convertBackendChat(joinedChat);
          
          // Update or add chat to list
          setBackendChats(prev => {
            const existing = prev.find(c => c.id === convertedChat.id);
            if (existing) {
              return prev.map(c => c.id === convertedChat.id ? convertedChat : c);
            }
            return [convertedChat, ...prev];
          });
          
          // Fetch messages for the joined chat
          await fetchMessages(convertedChat.id);
          
          console.log("✅ Chat: Successfully joined GROUP chat:", convertedChat.title, "ID:", convertedChat.id);
          return convertedChat.id;
        } catch (error: any) {
          console.error("❌ Chat: Failed to join GROUP chat with code:", code, "Error:", error);
          
          // Handle specific error types
          if (error.response?.status === 404) {
            console.log("❌ Invalid invite code");
            return null; // Invalid code
          } else if (error.response?.status === 403) {
            throw new Error("Bu grup chat'e katılma yetkiniz yok.");
          } else if (error.response?.status === 401) {
            throw new Error("Giriş yapmalısınız. Profile → Sync Mode'u açın.");
          } else {
            // Network or server error
            throw new Error(error.response?.data?.detail || error.message || "Bağlantı hatası. Tekrar deneyin.");
          }
        }
      } else {
        // Local mode
        const found = localChats.find(c => c.inviteCode.toUpperCase() === code.toUpperCase());
        if (!found) return null;
        if (!found.members.includes("You")) {
          setLocalChats(prev => prev.map(c => (c.id === found.id ? { ...c, members: [...c.members, "You"] } : c)));
        }
        return found.id;
      }
    },
    
    reactMessage: async (chatId: string, messageId: string, type: ReactionType) => {
      if (mode === "sync" && isAuthenticated) {
        try {
          await chatAPI.reactToMessage(chatId, messageId, type);
          console.log("✅ Chat: Added reaction:", type);
        } catch (error) {
          console.error("❌ Chat: Failed to react to message:", error);
        }
      } else {
        // Local mode
        setLocalMessages(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map(m => 
            m.id === messageId 
              ? { ...m, reactions: { ...(m.reactions || {}), [type]: ((m.reactions?.[type] || 0) + 1) as number } }
              : m
          ),
        }));
      }
    },
  }), [
    chats, 
    backendMessages,
    localMessages,
    mode, 
    isAuthenticated, 
    token, 
    isLoading, 
    error, 
    convertBackendChat, 
    convertBackendMessage, 
    fetchMessages, 
    refresh
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
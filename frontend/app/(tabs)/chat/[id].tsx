import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, router } from "expo-router";
import { useChat } from "../../../src/context/ChatContext";
import { useRuntimeConfig } from "../../../src/context/RuntimeConfigContext";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chats, messagesByChat, sendText, sendVoiceMock, markRead, reactMessage } = useChat();
  const { mode } = useRuntimeConfig();
  const insets = useSafeAreaInsets();
  const [text, setText] = React.useState("");
  const chat = chats.find((c) => c.id === id);
  const msgs = messagesByChat[id || ""] || [];
  
  console.log("🔍 CHAT DETAIL RENDER:", {
    chatId: id,
    chatFound: !!chat,
    chatTitle: chat?.title,
    messagesCount: msgs.length,
    allMessages: msgs,
    messagesByChat: messagesByChat
  });

  React.useEffect(() => { 
    if (id) markRead(id); 
  }, [id, markRead]);

  const onSend = async () => { 
    console.log("🔥 SEND BUTTON CLICKED! Text:", text, "Chat ID:", id);
    
    if (!id || !text.trim()) {
      console.log("❌ Cannot send - missing ID or text");
      return;
    }
    
    try {
      console.log("🚀 Calling sendText function...");
      await sendText(id, text.trim()); 
      console.log("✅ sendText completed successfully");
      setText(""); 
      console.log("✅ Text input cleared");
    } catch (error) {
      console.error("❌ Send error:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const onVoice = () => { 
    if (!id) return; 
    sendVoiceMock(id); 
  };

  const handleReaction = async (msgId: string, reactionType: string) => {
    if (!id) return;
    try {
      await reactMessage(id, msgId, reactionType as any);
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };

  const ReactBar = ({ msgId, counts }: { msgId: string; counts?: Record<string, number> }) => (
    <View style={styles.reactRow}>
      <TouchableOpacity onPress={() => handleReaction(msgId, 'like')} style={styles.reactBtn}>
        <Ionicons name="thumbs-up" size={16} color="#B8F1D9" />
        <Text style={styles.reactCount}>{counts?.like || 0}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleReaction(msgId, 'heart')} style={styles.reactBtn}>
        <Ionicons name="heart" size={16} color="#FF7CA3" />
        <Text style={styles.reactCount}>{counts?.heart || 0}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleReaction(msgId, 'clap')} style={styles.reactBtn}>
        <Ionicons name="hand-right" size={16} color="#7C9EFF" />
        <Text style={styles.reactCount}>{counts?.clap || 0}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleReaction(msgId, 'star')} style={styles.reactBtn}>
        <Ionicons name="star" size={16} color="#FFE3A3" />
        <Text style={styles.reactCount}>{counts?.star || 0}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Fixed Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.header} numberOfLines={1}>{chat?.title || 'Chat'}</Text>
            <Text style={styles.modeIndicator}>
              Mode: {mode} | Messages: {msgs.length}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Messages List */}
        <FlashList
          data={msgs}
          keyExtractor={(m) => {
            // Safe key extraction to prevent crash
            const safeKey = m.id ?? m._id ?? Math.random().toString(36).slice(2);
            console.log("🔑 KeyExtractor - Message:", {
              originalId: m.id,
              backupId: m._id,
              finalKey: safeKey,
              message: m.text?.slice(0, 30) + "..."
            });
            return safeKey.toString();
          }}
          estimatedItemSize={80}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 10 }}>
              <View style={[styles.bubble, item.author === 'me' ? styles.mine : styles.theirs]}>
                <Text style={styles.authorText}>{item.author_name || item.author}</Text>
                {item.type === 'text' ? (
                  <Text style={styles.bubbleText}>{item.text}</Text>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="mic" size={16} color="#000" />
                    <Text style={{ color: '#000', fontWeight: '700' }}>Voice message ({item.durationSec || 3}s)</Text>
                  </View>
                )}
                <Text style={styles.timeText}>
                  {new Date(item.created_at || item.ts).toLocaleTimeString()}
                </Text>
              </View>
              <ReactBar msgId={item.id} counts={item.reactions} />
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#444" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          )}
        />

        {/* Message Composer */}
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity onPress={onVoice} style={styles.micBtn}>
            <Ionicons name="mic" size={18} color="#000" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#777"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            onSubmitEditing={onSend}
            blurOnSubmit={false}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={onSend} style={[styles.sendBtn, { opacity: text.trim() ? 1 : 0.5 }]} disabled={!text.trim()}>
            <Ionicons name="send" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0c0c0c' 
  },
  headerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: { 
    padding: 8, 
    marginRight: 8,
    borderRadius: 20,
  },
  headerTitleContainer: { 
    flex: 1, 
    alignItems: 'center' 
  },
  header: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '700',
    textAlign: 'center' 
  },
  modeIndicator: { 
    color: '#A3C9FF', 
    fontSize: 11, 
    textAlign: 'center',
    marginTop: 2
  },
  headerSpacer: { 
    width: 40 
  },
  bubble: { 
    maxWidth: '75%', 
    padding: 12, 
    borderRadius: 16, 
    marginVertical: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mine: { 
    backgroundColor: '#B8F1D9', 
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirs: { 
    backgroundColor: '#FFCFE1', 
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { 
    color: '#000', 
    fontSize: 15,
    lineHeight: 20,
  },
  authorText: { 
    color: '#333', 
    fontSize: 11, 
    fontWeight: '600', 
    marginBottom: 2,
    opacity: 0.8
  },
  timeText: { 
    color: '#666', 
    fontSize: 10, 
    marginTop: 4,
    textAlign: 'right'
  },
  composer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    gap: 8, 
    paddingHorizontal: 16, 
    paddingTop: 12,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  input: { 
    flex: 1, 
    backgroundColor: '#1a1a1a', 
    color: '#fff', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderWidth: 1, 
    borderColor: '#333', 
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: { 
    backgroundColor: '#A3C9FF', 
    padding: 12, 
    borderRadius: 20,
    elevation: 2,
  },
  micBtn: { 
    backgroundColor: '#FFE3A3', 
    padding: 12, 
    borderRadius: 20,
  },
  reactRow: { 
    flexDirection: 'row', 
    gap: 12, 
    paddingHorizontal: 8, 
    marginTop: 4 
  },
  reactBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  reactCount: { 
    color: '#bdbdbd', 
    fontSize: 11,
    fontWeight: '600'
  },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60,
    paddingHorizontal: 40 
  },
  emptyText: { 
    color: '#777', 
    fontSize: 18, 
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 16 
  },
  emptySubtext: { 
    color: '#555', 
    fontSize: 14, 
    textAlign: 'center',
    marginTop: 4
  },
});
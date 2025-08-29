import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, router } from "expo-router";
import { useChat } from "../../../src/context/ChatContext";
import { useRuntimeConfig } from "../../../src/context/RuntimeConfigContext";
import { Ionicons } from "@expo/vector-icons";

export default function ChatDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chats, messagesByChat, sendText, sendVoiceMock, markRead, reactMessage } = useChat();
  const { mode } = useRuntimeConfig();
  const [text, setText] = React.useState("");
  const chat = chats.find((c) => c.id === id);
  const msgs = messagesByChat[id || ""] || [];

  React.useEffect(() => { 
    if (id) markRead(id); 
  }, [id, markRead]);

  const onSend = async () => { 
    if (!id || !text.trim()) return; 
    try {
      await sendText(id, text.trim()); 
      setText(""); 
    } catch (error) {
      console.error("Failed to send message:", error);
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
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.header}>{chat?.title || 'Chat'}</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Mode indicator */}
        <Text style={styles.modeIndicator}>
          Mode: {mode} | Messages: {msgs.length}
        </Text>

        <FlashList
          data={msgs}
          keyExtractor={(m) => m.id}
          estimatedItemSize={80}
          contentContainerStyle={{ padding: 12 }}
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
              <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
            </View>
          )}
        />

        <View style={styles.composer}>
          <TouchableOpacity onPress={onVoice} style={styles.micBtn}>
            <Ionicons name="mic" size={18} color="#000" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Message"
            placeholderTextColor="#777"
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity onPress={onSend} style={styles.sendBtn}>
            <Ionicons name="send" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0c0c' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8 },
  header: { color: '#fff', fontSize: 18, fontWeight: '800', padding: 8, flex: 1, textAlign: 'center' },
  modeIndicator: { color: '#A3C9FF', fontSize: 12, paddingHorizontal: 16, paddingBottom: 8 },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 12, marginVertical: 4 },
  mine: { backgroundColor: '#B8F1D9', alignSelf: 'flex-end' },
  theirs: { backgroundColor: '#FFCFE1', alignSelf: 'flex-start' },
  bubbleText: { color: '#000', fontSize: 16 },
  authorText: { color: '#000', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  timeText: { color: '#666', fontSize: 10, marginTop: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: '#1a1a1a', backgroundColor: '#111' },
  input: { flex: 1, backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#222', maxHeight: 100 },
  sendBtn: { backgroundColor: '#A3C9FF', padding: 10, borderRadius: 12 },
  micBtn: { backgroundColor: '#FFE3A3', padding: 10, borderRadius: 12 },
  reactRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 8, marginTop: 4 },
  reactBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  reactCount: { color: '#bdbdbd', fontSize: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#777', fontSize: 16, textAlign: 'center' },
});
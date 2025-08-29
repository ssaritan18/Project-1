import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useChat } from "../../../src/context/ChatContext";
import { useRuntimeConfig } from "../../../src/context/RuntimeConfigContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatList() {
  const { chats, createGroup, joinByCode, refresh, isLoading, error } = useChat();
  const { mode } = useRuntimeConfig();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");

  const openChat = (id: string) => router.push(`/(tabs)/chat/${id}`);

  const create = async () => {
    if (!title.trim()) return;
    try {
      const id = await createGroup(title.trim());
      setTitle("");
      openChat(id);
    } catch (error) {
      console.error("Failed to create chat:", error);
      Alert.alert("Error", "Failed to create chat. Please try again.");
    }
  };

  const join = async () => {
    if (!code.trim()) return;
    try {
      const id = await joinByCode(code.trim());
      setCode("");
      if (id) openChat(id);
      else Alert.alert("Error", "Invalid invite code or chat not found.");
    } catch (error) {
      console.error("Failed to join chat:", error);
      Alert.alert("Error", "Failed to join chat. Please try again.");
    }
  };

  const handleRefresh = async () => {
    try {
      await refresh();
    } catch (error) {
      console.error("Failed to refresh chats:", error);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.header}>Chats & Groups</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn} disabled={isLoading}>
              <Ionicons name="refresh" size={20} color={isLoading ? "#666" : "#A3C9FF"} />
            </TouchableOpacity>
          </View>
          
          {/* Status indicator */}
          <Text style={styles.modeIndicator}>
            Mode: {mode} | Chats: {chats.length} | {isLoading ? "Loading..." : "Ready"}
          </Text>
          
          {error && (
            <Text style={styles.errorText}>⚠️ {error}</Text>
          )}
        </View>
        
        {/* Create & Join Section */}
        <View style={styles.actionsContainer}>
          <View style={styles.newRow}>
            <TextInput 
              style={styles.input} 
              placeholder="New group title" 
              placeholderTextColor="#777" 
              value={title} 
              onChangeText={setTitle}
              maxLength={50}
            />
            <TouchableOpacity 
              style={[styles.createBtn, { opacity: title.trim() && !isLoading ? 1 : 0.5 }]} 
              onPress={create} 
              disabled={!title.trim() || isLoading}
            >
              <Ionicons name="add" size={20} color="#000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.newRow}>
            <TextInput 
              style={styles.input} 
              placeholder="Join by invite code" 
              placeholderTextColor="#777" 
              value={code} 
              onChangeText={setCode}
              autoCapitalize="characters"
              maxLength={10}
            />
            <TouchableOpacity 
              style={[styles.joinBtn, { opacity: code.trim() && !isLoading ? 1 : 0.5 }]} 
              onPress={join} 
              disabled={!code.trim() || isLoading}
            >
              <Ionicons name="key" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Chats List */}
        <FlashList
          data={chats}
          keyExtractor={(i) => i.id}
          estimatedItemSize={80}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => openChat(item.id)}>
              <View style={styles.chatInfo}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  Members: {Array.isArray(item.members) ? item.members.join(", ") : "Loading..."}
                </Text>
                <Text style={styles.inviteCode}>
                  Code: {item.inviteCode || item.invite_code}
                </Text>
              </View>
              {item.unread ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unread}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" color="#666" size={20} />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 24) }}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#444" />
              <Text style={styles.emptyText}>
                {isLoading ? "Loading chats..." : "No chats yet"}
              </Text>
              <Text style={styles.emptySubtext}>
                {isLoading ? "Please wait..." : "Create or join a chat to get started!"}
              </Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
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
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between'
  },
  header: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: '700' 
  },
  refreshBtn: { 
    padding: 8,
    borderRadius: 20,
  },
  modeIndicator: { 
    color: '#A3C9FF', 
    fontSize: 12, 
    marginTop: 4
  },
  errorText: { 
    color: '#FFCFE1', 
    fontSize: 12, 
    marginTop: 4,
    fontWeight: '500'
  },
  actionsContainer: {
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  newRow: { 
    flexDirection: 'row', 
    gap: 8, 
    alignItems: 'center', 
    marginBottom: 8
  },
  input: { 
    flex: 1, 
    backgroundColor: '#1a1a1a', 
    color: '#fff', 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    borderWidth: 1, 
    borderColor: '#333',
    fontSize: 15
  },
  createBtn: { 
    backgroundColor: '#B8F1D9', 
    padding: 12, 
    borderRadius: 12,
    elevation: 2
  },
  joinBtn: { 
    backgroundColor: '#FFE3A3', 
    padding: 12, 
    borderRadius: 12,
    elevation: 2
  },
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#111', 
    borderRadius: 12, 
    padding: 16, 
    marginVertical: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chatInfo: {
    flex: 1,
    marginRight: 12
  },
  title: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700',
    marginBottom: 4
  },
  meta: { 
    color: '#bdbdbd', 
    fontSize: 13,
    marginBottom: 2
  },
  inviteCode: {
    color: '#A3C9FF',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600'
  },
  badge: { 
    minWidth: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: '#FFCFE1', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 8, 
    marginRight: 8
  },
  badgeText: { 
    color: '#000', 
    fontSize: 12, 
    fontWeight: '800' 
  },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 80,
    paddingHorizontal: 40
  },
  emptyText: { 
    color: '#777', 
    fontSize: 18, 
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16
  },
  emptySubtext: { 
    color: '#555', 
    fontSize: 14, 
    textAlign: 'center',
    marginTop: 4
  },
});
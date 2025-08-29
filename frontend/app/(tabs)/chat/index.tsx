import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useChat } from "../../../src/context/ChatContext";
import { useRuntimeConfig } from "../../../src/context/RuntimeConfigContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function ChatList() {
  const { chats, createGroup, joinByCode, refresh, isLoading, error } = useChat();
  const { mode } = useRuntimeConfig();
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
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Chats & Groups</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#A3C9FF" />
          </TouchableOpacity>
        </View>
        
        {/* Mode indicator */}
        <Text style={styles.modeIndicator}>
          Mode: {mode} | Chats: {chats.length} | {isLoading ? "Loading..." : "Ready"}
        </Text>
        
        {error && (
          <Text style={styles.errorText}>Error: {error}</Text>
        )}
        
        <View style={styles.newRow}>
          <TextInput 
            style={styles.input} 
            placeholder="New group title" 
            placeholderTextColor="#777" 
            value={title} 
            onChangeText={setTitle} 
          />
          <TouchableOpacity style={styles.createBtn} onPress={create} disabled={isLoading}>
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
          />
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: '#FFE3A3' }]} onPress={join} disabled={isLoading}>
            <Ionicons name="key" size={20} color="#000" />
          </TouchableOpacity>
        </View>
        
        <FlashList
          data={chats}
          keyExtractor={(i) => i.id}
          estimatedItemSize={80}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => openChat(item.id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>Members: {Array.isArray(item.members) ? item.members.join(", ") : "Loading..."}</Text>
                <Text style={styles.meta}>Invite code: {item.inviteCode || item.invite_code}</Text>
              </View>
              {item.unread ? (
                <View style={styles.badge}><Text style={styles.badgeText}>{item.unread}</Text></View>
              ) : null}
              <Ionicons name="chevron-forward" color="#888" size={18} />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {isLoading ? "Loading chats..." : "No chats yet. Create or join one!"}
              </Text>
            </View>
          )}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0c0c', padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  header: { color: '#fff', fontSize: 22, fontWeight: '700' },
  refreshBtn: { padding: 8 },
  modeIndicator: { color: '#A3C9FF', fontSize: 12, marginBottom: 8 },
  errorText: { color: '#FFCFE1', fontSize: 12, marginBottom: 8 },
  newRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#111', color: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#1a1a1a' },
  createBtn: { backgroundColor: '#B8F1D9', padding: 10, borderRadius: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111', borderRadius: 16, padding: 12, marginBottom: 10 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  meta: { color: '#bdbdbd', marginTop: 4 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#FFCFE1', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginRight: 6 },
  badgeText: { color: '#000', fontSize: 12, fontWeight: '800' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#777', fontSize: 16 },
});
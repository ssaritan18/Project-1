import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useChat } from "../../../src/context/ChatContext";
import { useRuntimeConfig } from "../../../src/context/RuntimeConfigContext";
import { useAuth } from "../../../src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileAvatar } from "../../../src/components/ProfileAvatar";

export default function ChatList() {
  const { chats, createGroup, joinByCode, refresh, isLoading, error } = useChat();
  const { mode } = useRuntimeConfig();
  const { palette } = useAuth();
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

  const groupChats = chats.filter(chat => chat.type === 'GROUP');
  const directChats = chats.filter(chat => chat.type === 'DIRECT');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>💬 Chats & Groups</Text>
            <TouchableOpacity onPress={handleRefresh} style={[styles.refreshBtn, { backgroundColor: palette.primary }]} disabled={isLoading}>
              <Ionicons name="refresh" size={20} color={isLoading ? "#666" : "#0c0c0c"} />
            </TouchableOpacity>
          </View>
          
          {/* Status indicator */}
          <Text style={styles.statusText}>
            Mode: {mode} • Total: {chats.length} chats • {isLoading ? "Loading..." : "Ready"}
          </Text>
          
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={16} color="#FF6B6B" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
        
        {/* Create & Join Section */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>✨ Quick Actions</Text>
          
          <View style={styles.actionRow}>
            <TextInput 
              style={styles.input} 
              placeholder="Create new group chat..." 
              placeholderTextColor="#777" 
              value={title} 
              onChangeText={setTitle}
              maxLength={50}
            />
            <TouchableOpacity 
              style={[styles.createBtn, { 
                backgroundColor: palette.accent, 
                opacity: title.trim() && !isLoading ? 1 : 0.5 
              }]} 
              onPress={create} 
              disabled={!title.trim() || isLoading}
            >
              <Ionicons name="add-circle" size={20} color="#0c0c0c" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.actionRow}>
            <TextInput 
              style={styles.input} 
              placeholder="Join group with invite code..." 
              placeholderTextColor="#777" 
              value={code} 
              onChangeText={setCode}
              autoCapitalize="characters"
              maxLength={10}
            />
            <TouchableOpacity 
              style={[styles.joinBtn, { 
                backgroundColor: palette.secondary, 
                opacity: code.trim() && !isLoading ? 1 : 0.5 
              }]} 
              onPress={join} 
              disabled={!code.trim() || isLoading}
            >
              <Ionicons name="key" size={20} color="#0c0c0c" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Chats List */}
        <FlashList
          data={chats}
          keyExtractor={(i) => i.id}
          estimatedItemSize={80}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatCard} onPress={() => openChat(item.id)}>
              {/* Chat Avatar */}
              <View style={styles.chatAvatarContainer}>
                {item.type === 'GROUP' ? (
                  <View style={[styles.groupIcon, { backgroundColor: `${palette.primary}20`, borderColor: `${palette.primary}40` }]}>
                    <Ionicons name="people" size={24} color={palette.primary} />
                  </View>
                ) : (
                  <ProfileAvatar
                    userId={item.id}
                    userName={item.title}
                    size="medium"
                    onPress={() => Alert.alert("Profile", `View ${item.title}'s profile`)}
                  />
                )}
              </View>
              
              {/* Chat Info */}
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatTitle} numberOfLines={1}>{item.title}</Text>
                  {item.unread ? (
                    <View style={[styles.unreadBadge, { backgroundColor: palette.accent }]}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  ) : null}
                </View>
                
                <Text style={styles.chatMeta} numberOfLines={1}>
                  {item.type === 'GROUP' 
                    ? `👥 ${Array.isArray(item.members) ? item.members.length : 0} members`
                    : "💬 Direct message"
                  }
                </Text>
                
                {/* Group invite code */}
                {(item.inviteCode || item.invite_code) && (
                  <View style={styles.inviteCodeContainer}>
                    <Ionicons name="key-outline" size={12} color={palette.primary} />
                    <Text style={[styles.inviteCode, { color: palette.primary }]}>
                      {item.inviteCode || item.invite_code}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Chat Type Badge */}
              <View style={styles.chatTypeContainer}>
                <View style={[styles.chatTypeBadge, { 
                  backgroundColor: item.type === 'GROUP' ? `${palette.accent}20` : `${palette.secondary}20` 
                }]}>
                  <Text style={[styles.chatTypeText, { 
                    color: item.type === 'GROUP' ? palette.accent : palette.secondary 
                  }]}>
                    {item.type === 'GROUP' ? 'GROUP' : 'DIRECT'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" color="#666" size={20} />
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 24) }}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#444" />
              <Text style={styles.emptyTitle}>
                {isLoading ? "Loading chats..." : "No chats yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isLoading ? "Please wait..." : "Create a group or start a direct message to get started!"}
              </Text>
              {!isLoading && (
                <TouchableOpacity 
                  style={[styles.emptyActionBtn, { backgroundColor: palette.primary }]}
                  onPress={() => Alert.alert("Get Started", "Use the actions above to create or join a chat!")}
                >
                  <Text style={styles.emptyActionText}>Get Started</Text>
                </TouchableOpacity>
              )}
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
  header: {
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between'
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: '700' 
  },
  refreshBtn: { 
    padding: 8,
    borderRadius: 8,
  },
  statusText: { 
    color: '#bdbdbd', 
    fontSize: 12, 
    marginTop: 4
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  errorText: { 
    color: '#FF6B6B', 
    fontSize: 12, 
    fontWeight: '500',
    flex: 1,
  },
  actionsContainer: {
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  actionRow: { 
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
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderWidth: 1, 
    borderColor: '#333',
    fontSize: 15
  },
  createBtn: { 
    padding: 12, 
    borderRadius: 12,
  },
  joinBtn: { 
    padding: 12, 
    borderRadius: 12,
  },
  chatCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#111', 
    borderRadius: 12, 
    padding: 16, 
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#222',
  },
  chatAvatarContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chatInfo: {
    flex: 1,
    marginRight: 12
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatTitle: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: { 
    minWidth: 20, 
    height: 20, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 6, 
  },
  unreadText: { 
    color: '#0c0c0c', 
    fontSize: 11, 
    fontWeight: '700' 
  },
  chatMeta: { 
    color: '#bdbdbd', 
    fontSize: 13,
    marginBottom: 4
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inviteCode: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600'
  },
  chatTypeContainer: {
    alignItems: 'center',
    gap: 8,
  },
  chatTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chatTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 80,
    paddingHorizontal: 40
  },
  emptyTitle: { 
    color: '#777', 
    fontSize: 20, 
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: { 
    color: '#555', 
    fontSize: 14, 
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionText: {
    color: '#0c0c0c',
    fontSize: 14,
    fontWeight: '600',
  },
});

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
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
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f172a']}
      style={styles.container}
    >
      <View style={[styles.contentContainer, { paddingTop: insets.top + 20 }]}>
        {/* Glow Header */}
        <LinearGradient
          colors={['#8B5CF6', '#EC4899', '#F97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glowHeader}
        >
          <Text style={styles.glowHeaderTitle}>💬 Chat Hub</Text>
          <Text style={styles.glowHeaderSubtitle}>Connect and chat with ADHDers</Text>
        </LinearGradient>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Quick Actions Section */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            
            {/* Create Chat Card */}
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.1)']}
              style={styles.actionCard}
            >
              <Text style={styles.actionCardTitle}>🌟 Create Group Chat</Text>
              <View style={styles.actionRow}>
                <TextInput 
                  style={styles.glowInput} 
                  placeholder="Enter group name..." 
                  placeholderTextColor="#B9B9B9" 
                  value={title} 
                  onChangeText={setTitle}
                  maxLength={50}
                />
                <TouchableOpacity onPress={create} disabled={!title.trim() || isLoading}>
                  <LinearGradient 
                    colors={title.trim() && !isLoading ? ['#8B5CF6', '#A855F7'] : ['#666', '#555']} 
                    style={styles.actionBtn}
                  >
                    <Ionicons name="add-circle" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

          {/* Chats List */}
          <FlashList
            </LinearGradient>

            {/* Join Chat Card */}
            <LinearGradient
              colors={['rgba(236, 72, 153, 0.1)', 'rgba(249, 115, 22, 0.1)']}
              style={styles.actionCard}
            >
              <Text style={styles.actionCardTitle}>🎯 Join with Code</Text>
              <View style={styles.actionRow}>
                <TextInput 
                  style={styles.glowInput} 
                  placeholder="Enter invite code..." 
                  placeholderTextColor="#B9B9B9" 
                  value={code} 
                  onChangeText={setCode}
                  autoCapitalize="characters"
                  maxLength={10}
                />
                <TouchableOpacity onPress={join} disabled={!code.trim() || isLoading}>
                  <LinearGradient 
                    colors={code.trim() && !isLoading ? ['#EC4899', '#F97316'] : ['#666', '#555']} 
                    style={styles.actionBtn}
                  >
                    <Ionicons name="enter" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

          {/* Chats List */}
          <FlashList
            </LinearGradient>
          </View>

          {/* Chats List */}
          <FlashList
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

          {/* Chats List */}
          <FlashList
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

          {/* Chats List */}
          <FlashList
                ) : (
                  <ProfileAvatar
                    userId={item.id}
                    userName={item.title}
                    size="medium"
                    onPress={() => Alert.alert("Profile", `View ${item.title}'s profile`)}
                  />
                )}
              </View>

          {/* Chats List */}
          <FlashList
              
              {/* Chat Info */}
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatTitle} numberOfLines={1}>{item.title}</Text>
                  {item.unread ? (
                    <View style={[styles.unreadBadge, { backgroundColor: palette.accent }]}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>

          {/* Chats List */}
          <FlashList
                  ) : null}
                </View>

          {/* Chats List */}
          <FlashList
                
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

          {/* Chats List */}
          <FlashList
                )}
              </View>

          {/* Chats List */}
          <FlashList
              
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

          {/* Chats List */}
          <FlashList
                <Ionicons name="chevron-forward" color="#666" size={20} />
              </View>

          {/* Chats List */}
          <FlashList
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

          {/* Chats List */}
          <FlashList
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
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  actionsSection: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  contentContainer: {
    flex: 1,
  },
  glowHeader: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  glowHeaderTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  glowHeaderSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  actionCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  glowInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  chatListSection: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 53, 71, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 53, 71, 0.3)',
  },
  errorText: {
    color: '#FF3547',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    padding: 16,
    marginBottom: 12,
  },
  chatAvatar: {
    marginRight: 12,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.3)',
  },
  chatInfo: {
    flex: 1,
    marginRight: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  badge: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  meta: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  inviteCode: {
    fontSize: 12,
    color: '#6C5CE7',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  emptyTip: {
    fontSize: 14,
    color: '#6C5CE7',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

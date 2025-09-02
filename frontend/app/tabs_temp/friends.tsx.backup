import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from "react-native";
import { useFriends } from "../../src/context/FriendsContext";
import { useChat } from "../../src/context/ChatContext";
import { Ionicons } from "@expo/vector-icons";
import { useRuntimeConfig } from "../../src/context/RuntimeConfigContext";
import { api } from "../../src/lib/api";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useAuth } from "../../src/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function FriendsScreen() {
  const { friends, requests, presence, wsConnectionStatus, sendRequest, acceptRequest, rejectRequest, refresh } = useFriends();
  const { syncEnabled, wsEnabled } = useRuntimeConfig();
  const { token, palette } = useAuth();
  const { openDirectChat } = useChat();
  const insets = useSafeAreaInsets();
  const [friendQuery, setFriendQuery] = React.useState("");

  React.useEffect(() => { refresh(); }, [refresh]);

  // Sliding request card animation
  const showCard = requests.length > 0;
  const slide = useSharedValue(0);
  React.useEffect(() => {
    slide.value = withTiming(showCard ? 1 : 0, { duration: 250, easing: Easing.out(Easing.ease) });
  }, [showCard]);
  const cardStyle = useAnimatedStyle(() => ({ 
    transform: [{ translateY: (1 - slide.value) * -60 }], 
    opacity: slide.value 
  }));

  const addFriend = async () => {
    const q = friendQuery.trim();
    if (!q) return;
    try {
      if (syncEnabled) {
        if (q.includes("@")) {
          await sendRequest(q);
        } else {
          const res = await api.get("/friends/find", { params: { q } });
          const email = res.data?.user?.email;
          if (!email) throw new Error("No email associated");
          await sendRequest(email);
        }
      } else {
        await sendRequest(q);
      }
    } catch (e) {
      Alert.alert("Error", "Could not send friend request. Please try again.");
    } finally {
      setFriendQuery("");
    }
  };

  const handleMessageFriend = async (friend: any) => {
    try {
      console.log("💬 Starting direct chat with friend:", friend);
      const chatId = await openDirectChat(friend.id || friend._id);
      console.log("✅ Direct chat opened, navigating to:", chatId);
      router.push(`/(tabs)/chat/${chatId}`);
    } catch (error: any) {
      console.error("❌ Failed to open direct chat:", error);
      Alert.alert("Chat Error", error.message || "Could not start chat. Please try again.");
    }
  };

  const getConnectionStatusColor = () => {
    if (wsConnectionStatus.includes('✅')) return '#00C851';
    if (wsConnectionStatus.includes('🔄')) return '#FFB347';
    return '#FF6B6B';
  };

  const getConnectionStatusText = () => {
    if (wsConnectionStatus.includes('✅')) return 'Connected';
    if (wsConnectionStatus.includes('🔄')) return 'Connecting...';
    return 'Disconnected';
  };

  const onlineFriends = friends.filter(friend => presence[friend.id] || presence[friend._id]);
  const offlineFriends = friends.filter(friend => !presence[friend.id] && !presence[friend._id]);
  const firstReq = requests[0];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>👥 Friends</Text>
          <Text style={styles.headerSubtitle}>
            {syncEnabled ? 'Online Mode' : 'Local Mode'} • {friends.length} friends
          </Text>
        </View>

        {/* WebSocket Status */}
        {syncEnabled && (
          <View style={[styles.statusCard, { borderLeftColor: getConnectionStatusColor() }]}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getConnectionStatusColor() }]} />
              <Text style={styles.statusText}>WebSocket: {getConnectionStatusText()}</Text>
              <TouchableOpacity 
                style={[styles.refreshBtn, { backgroundColor: palette.primary }]}
                onPress={refresh}
              >
                <Ionicons name="refresh" size={16} color="#0c0c0c" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
          showsVerticalScrollIndicator={false}
        >
          {/* Friend Request Card */}
          <Animated.View style={[styles.requestCard, cardStyle]}> 
            {firstReq && (
              <View style={styles.requestContent}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestTitle}>Friend Request</Text>
                  <Text style={styles.requestFrom}>{firstReq.from}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity 
                    style={[styles.acceptBtn, { backgroundColor: palette.accent }]} 
                    onPress={() => acceptRequest(firstReq.id)}
                  >
                    <Ionicons name="checkmark" size={16} color="#0c0c0c" />
                    <Text style={styles.actionBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.rejectBtn} 
                    onPress={() => rejectRequest(firstReq.id)}
                  >
                    <Ionicons name="close" size={16} color="#FF6B6B" />
                    <Text style={[styles.actionBtnText, { color: '#FF6B6B' }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Add Friend Section */}
          <View style={styles.addFriendSection}>
            <Text style={styles.sectionTitle}>✨ Add New Friend</Text>
            <View style={styles.addFriendRow}>
              <TextInput 
                style={styles.friendInput} 
                placeholder="Enter name or email address" 
                placeholderTextColor="#777" 
                value={friendQuery} 
                onChangeText={setFriendQuery}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity 
                style={[styles.addBtn, { backgroundColor: palette.primary, opacity: friendQuery.trim() ? 1 : 0.5 }]} 
                onPress={addFriend}
                disabled={!friendQuery.trim()}
              >
                <Ionicons name="person-add" size={20} color="#0c0c0c" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Online Friends */}
          {onlineFriends.length > 0 && (
            <View style={styles.friendsSection}>
              <Text style={styles.sectionTitle}>🟢 Online Friends ({onlineFriends.length})</Text>
              {onlineFriends.map((friend, index) => (
                <View key={friend.id || friend._id || `online-${index}`} style={styles.friendCard}>
                  <View style={styles.friendInfo}>
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>
                        {(friend.name || friend.email || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.friendDetails}>
                      <Text style={styles.friendName}>{friend.name || 'Unknown'}</Text>
                      {friend.email && (
                        <Text style={styles.friendEmail}>{friend.email}</Text>
                      )}
                      <View style={styles.onlineIndicator}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.onlineText}>Online</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.messageBtn, { backgroundColor: palette.secondary }]}
                    onPress={() => handleMessageFriend(friend)}
                  >
                    <Ionicons name="chatbubble" size={16} color="#0c0c0c" />
                    <Text style={styles.messageBtnText}>Message</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Offline Friends */}
          {offlineFriends.length > 0 && (
            <View style={styles.friendsSection}>
              <Text style={styles.sectionTitle}>⚫ Offline Friends ({offlineFriends.length})</Text>
              {offlineFriends.map((friend, index) => (
                <View key={friend.id || friend._id || `offline-${index}`} style={styles.friendCard}>
                  <View style={styles.friendInfo}>
                    <View style={[styles.friendAvatar, { opacity: 0.6 }]}>
                      <Text style={styles.friendAvatarText}>
                        {(friend.name || friend.email || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.friendDetails}>
                      <Text style={[styles.friendName, { opacity: 0.8 }]}>{friend.name || 'Unknown'}</Text>
                      {friend.email && (
                        <Text style={[styles.friendEmail, { opacity: 0.6 }]}>{friend.email}</Text>
                      )}
                      <View style={styles.offlineIndicator}>
                        <View style={styles.offlineDot} />
                        <Text style={styles.offlineText}>Offline</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.messageBtn, { backgroundColor: '#333', opacity: 0.7 }]}
                    onPress={() => handleMessageFriend(friend)}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color="#bdbdbd" />
                    <Text style={[styles.messageBtnText, { color: '#bdbdbd' }]}>Message</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {friends.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#444" />
              <Text style={styles.emptyTitle}>No Friends Yet</Text>
              <Text style={styles.emptySubtitle}>
                Add friends by their name or email address to start connecting!
              </Text>
            </View>
          )}
        </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: '700' 
  },
  headerSubtitle: { 
    color: '#bdbdbd', 
    fontSize: 14, 
    marginTop: 2 
  },
  statusCard: {
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
  },
  requestCard: {
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  requestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    color: '#A3C9FF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  requestFrom: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    gap: 4,
  },
  actionBtnText: {
    color: '#0c0c0c',
    fontSize: 12,
    fontWeight: '600',
  },
  addFriendSection: {
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  addFriendRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  friendInput: {
    flex: 1,
    backgroundColor: '#111',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 16,
  },
  addBtn: {
    padding: 12,
    borderRadius: 12,
  },
  friendsSection: {
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  friendEmail: {
    color: '#bdbdbd',
    fontSize: 13,
    marginBottom: 4,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00C851',
  },
  onlineText: {
    color: '#00C851',
    fontSize: 12,
    fontWeight: '600',
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
  },
  offlineText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  messageBtnText: {
    color: '#0c0c0c',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
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
  },
});

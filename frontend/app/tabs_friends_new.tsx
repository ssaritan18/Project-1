import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from "react-native";
import { useFriends } from "../../src/context/FriendsContext";
import { useChat } from "../../src/context/ChatContext";
import { Ionicons } from "@expo/vector-icons";
import { useRuntimeConfig } from "../../src/context/RuntimeConfigContext";
import { useAuth } from "../../src/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileAvatar } from "../../src/components/ProfileAvatar";

export default function FriendsScreen() {
  const { friends, requests, presence, wsConnectionStatus, sendRequest, acceptRequest, rejectRequest, refresh } = useFriends();
  const { syncEnabled } = useRuntimeConfig();
  const { palette } = useAuth();
  const { openDirectChat } = useChat();
  const insets = useSafeAreaInsets();
  const [friendQuery, setFriendQuery] = React.useState("");

  React.useEffect(() => { refresh(); }, [refresh]);

  const addFriend = async () => {
    const email = friendQuery.trim();
    if (!email) return;
    
    try {
      await sendRequest(email);
      setFriendQuery("");
      Alert.alert("✅ Request Sent!", `Friend request sent to ${email}`);
    } catch (error) {
      Alert.alert("❌ Error", `Failed to send friend request: ${error.message}`);
    }
  };

  const handleAcceptRequest = async (email: string) => {
    try {
      await acceptRequest(email);
      Alert.alert("🎉 Friend Added!", `${email} is now your friend!`);
    } catch (error) {
      Alert.alert("❌ Error", `Failed to accept request: ${error.message}`);
    }
  };

  const handleRejectRequest = async (email: string) => {
    try {
      await rejectRequest(email);
      Alert.alert("✅ Request Rejected", `Request from ${email} has been rejected.`);
    } catch (error) {
      Alert.alert("❌ Error", `Failed to reject request: ${error.message}`);
    }
  };

  const handleMessageFriend = async (friendEmail: string) => {
    try {
      await openDirectChat(friendEmail);
      // Navigation to chat will be handled by the chat context
    } catch (error) {
      Alert.alert("❌ Error", `Failed to open chat: ${error.message}`);
    }
  };

  const getConnectionStatusColor = () => {
    switch (wsConnectionStatus) {
      case 'connected': return '#00C851';
      case 'connecting': return '#FF6B35';
      case 'disconnected': return '#FF3547';
      case 'error': return '#FF3547';
      default: return '#888';
    }
  };

  const getConnectionStatusText = () => {
    switch (wsConnectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
  };

  const onlineFriends = friends.filter(f => presence[f.email] === 'online');
  const offlineFriends = friends.filter(f => presence[f.email] !== 'online');

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header with Connection Status */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 Friends</Text>
        <View style={styles.connectionStatus}>
          <View style={[styles.statusDot, { backgroundColor: getConnectionStatusColor() }]} />
          <Text style={styles.statusText}>{getConnectionStatusText()}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Friend Requests */}
        {requests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 Friend Requests ({requests.length})</Text>
            {requests.map((req) => (
              <View key={req.email} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <ProfileAvatar 
                    userName={req.name || req.email}
                    size="medium"
                  />
                  <View style={styles.requestDetails}>
                    <Text style={styles.requestName}>{req.name || req.email}</Text>
                    <Text style={styles.requestEmail}>{req.email}</Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleAcceptRequest(req.email)}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleRejectRequest(req.email)}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Add Friend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>➕ Add Friend</Text>
          <View style={styles.addFriendContainer}>
            <TextInput
              style={styles.friendInput}
              placeholder="Enter email address..."
              placeholderTextColor="#666"
              value={friendQuery}
              onChangeText={setFriendQuery}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: palette.primary }]}
              onPress={addFriend}
              disabled={!friendQuery.trim()}
            >
              <Ionicons name="person-add" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Online Friends */}
        {onlineFriends.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🟢 Online ({onlineFriends.length})</Text>
            {onlineFriends.map((friend) => (
              <View key={friend.email} style={styles.friendCard}>
                <View style={styles.friendInfo}>
                  <ProfileAvatar 
                    userName={friend.name || friend.email}
                    size="medium"
                    showOnlineStatus={true}
                    isOnline={true}
                  />
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>{friend.name || friend.email}</Text>
                    <Text style={styles.friendEmail}>{friend.email}</Text>
                    <View style={styles.onlineIndicator}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.onlineText}>Online now</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.messageBtn}
                  onPress={() => handleMessageFriend(friend.email)}
                >
                  <Ionicons name="chatbubble" size={18} color="#4A90E2" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Offline Friends */}
        {offlineFriends.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚫ Offline ({offlineFriends.length})</Text>
            {offlineFriends.map((friend) => (
              <View key={friend.email} style={[styles.friendCard, styles.offlineFriendCard]}>
                <View style={styles.friendInfo}>
                  <ProfileAvatar 
                    userName={friend.name || friend.email}
                    size="medium"
                    showOnlineStatus={true}
                    isOnline={false}
                  />
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>{friend.name || friend.email}</Text>
                    <Text style={styles.friendEmail}>{friend.email}</Text>
                    <Text style={styles.offlineText}>Last seen recently</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={[styles.messageBtn, styles.messageOfflineBtn]}
                  onPress={() => handleMessageFriend(friend.email)}
                >
                  <Ionicons name="chatbubble-outline" size={18} color="#666" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {friends.length === 0 && requests.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Friends Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start building your ADHD support network by adding friends!
            </Text>
            <Text style={styles.emptyTip}>
              💡 Tip: Share your email with other ADHDers to connect
            </Text>
          </View>
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  connectionStatus: {
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
    color: '#bdbdbd',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  requestCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestDetails: {
    marginLeft: 12,
    flex: 1,
  },
  requestName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  requestEmail: {
    color: '#bdbdbd',
    fontSize: 14,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: '#00C851',
  },
  rejectBtn: {
    backgroundColor: '#FF3547',
  },
  addFriendContainer: {
    flexDirection: 'row',
    gap: 12,
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
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineFriendCard: {
    opacity: 0.7,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendDetails: {
    marginLeft: 12,
    flex: 1,
  },
  friendName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  friendEmail: {
    color: '#bdbdbd',
    fontSize: 14,
    marginBottom: 4,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00C851',
  },
  onlineText: {
    color: '#00C851',
    fontSize: 12,
    fontWeight: '500',
  },
  offlineText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  messageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  messageOfflineBtn: {
    backgroundColor: 'rgba(102, 102, 102, 0.1)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#bdbdbd',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyTip: {
    color: '#A3C9FF',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
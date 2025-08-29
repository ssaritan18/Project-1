import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, FlatList, ScrollView } from "react-native";
import { useFriends } from "../../src/context/FriendsContext";
import { Ionicons } from "@expo/vector-icons";
import { useRuntimeConfig } from "../../src/context/RuntimeConfigContext";
import { api } from "../../src/lib/api";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useAuth } from "../../src/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FriendsScreen() {
  const { friends, requests, posts, presence, wsConnectionStatus, sendRequest, acceptRequest, rejectRequest, addPost, reactPost, refresh, lastNotification, clearNotification } = useFriends();
  const { syncEnabled, wsEnabled } = useRuntimeConfig();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [friendQuery, setFriendQuery] = React.useState("");
  const [postText, setPostText] = React.useState("");
  const [showDebug, setShowDebug] = React.useState(false);

  React.useEffect(() => { refresh(); }, [refresh]);

  // Sliding request card
  const showCard = requests.length > 0;
  const slide = useSharedValue(0);
  React.useEffect(() => {
    slide.value = withTiming(showCard ? 1 : 0, { duration: 250, easing: Easing.out(Easing.ease) });
  }, [showCard]);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - slide.value) * -60 }], opacity: slide.value }));

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
      // ignore
    } finally {
      setFriendQuery("");
    }
  };

  const firstReq = requests[0];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.header}>Friends {syncEnabled ? "(Online)" : "(Local)"}</Text>
        {syncEnabled && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={[styles.statusText, { color: wsConnectionStatus.includes('✅') ? '#3DDC84' : '#FF6B6B' }]}>
              WebSocket: {wsConnectionStatus}
            </Text>
            <TouchableOpacity 
              style={{ backgroundColor: '#333', padding: 4, borderRadius: 6 }}
              onPress={() => {
                console.log("🔍 DEBUG CLICKED");
                setShowDebug(!showDebug);
              }}
            >
              <Text style={{ color: '#fff', fontSize: 10 }}>?</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: '#A3C9FF', padding: 6, borderRadius: 6, marginLeft: 8 }}
              onPress={() => {
                console.log("📱 Manual refresh button pressed");
                refresh();
              }}
            >
              <Text style={{ color: '#0c0c0c', fontSize: 10, fontWeight: 'bold' }}>🔄</Text>
            </TouchableOpacity>
          </View>
        )}

        <Animated.View style={[styles.topCard, cardStyle]}> 
          {firstReq ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.topCardText}>{firstReq.from}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(firstReq.id)}>
                  <Text style={{ color: '#000', fontWeight: '700' }}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(firstReq.id)}>
                  <Text style={{ color: '#000', fontWeight: '700' }}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </Animated.View>

        <View style={styles.row}>
          <TextInput style={styles.input} placeholder="Add by name or email" placeholderTextColor="#777" value={friendQuery} onChangeText={setFriendQuery} />
          <TouchableOpacity style={styles.actionBtn} onPress={addFriend}>
            <Ionicons name="person-add" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.section}>My Friends ({friends.length})</Text>
          
          {/* ENHANCED MANUAL FRIENDS RENDERING WITH DEBUG */}
          <View style={{ minHeight: 200, backgroundColor: '#111', borderRadius: 12, padding: 8 }}>
            {/* Debug information */}
            <View style={{ backgroundColor: '#222', padding: 6, marginBottom: 8, borderRadius: 4 }}>
              <Text style={{ color: '#A3C9FF', fontSize: 10 }}>
                🔍 DEBUG: Array.isArray={String(Array.isArray(friends))}, Length={friends.length}
              </Text>
              <Text style={{ color: '#A3C9FF', fontSize: 10 }}>
                Type: {typeof friends}, Content: {JSON.stringify(friends).slice(0, 100)}...
              </Text>
            </View>

            {friends.length === 0 ? (
              <View>
                <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>
                  No friends data (Array length: {friends.length})
                </Text>
                <Text style={{ color: '#666', textAlign: 'center', fontSize: 10, marginTop: 8 }}>
                  Array check: {Array.isArray(friends) ? 'IS ARRAY' : 'NOT ARRAY'}
                </Text>
              </View>
            ) : (
              <View>
                <Text style={{ color: '#4CAF50', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>
                  ✅ Found {friends.length} friends - Rendering now:
                </Text>
                {friends.map((friend, index) => {
                  // Extra logging for debugging
                  console.log(`🔍 MOBILE: Rendering friend ${index}:`, {
                    id: friend.id,
                    _id: friend._id,
                    name: friend.name,
                    email: friend.email,
                    fullObject: friend
                  });
                  
                  return (
                    <View 
                      key={friend.id || friend._id || `friend-${index}`} 
                      style={[styles.itemRow, { borderColor: '#4CAF50', borderWidth: 1 }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={presence[friend.id] || presence[friend._id] ? styles.dotOnline : styles.dotOffline} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemText, { fontSize: 14, fontWeight: 'bold' }]}>
                            {friend.name || 'No Name'}
                          </Text>
                          {friend.email && (
                            <Text style={[styles.itemText, { fontSize: 11, opacity: 0.7 }]}>
                              {friend.email}
                            </Text>
                          )}
                        </View>
                        <Text style={{ color: '#4CAF50', fontSize: 10 }}>#{index + 1}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Always show raw data for debugging */}
            <View style={{ marginTop: 12, backgroundColor: '#333', padding: 4, borderRadius: 4 }}>
              <Text style={{ color: '#fff', fontSize: 9 }}>Raw Friends Data:</Text>
              <Text style={{ color: '#fff', fontSize: 8, fontFamily: 'monospace' }}>
                {JSON.stringify(friends, null, 1).slice(0, 300)}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.section}>Share an Update</Text>
          <View style={styles.row}>
            <TextInput style={styles.input} placeholder="What would you like to share?" placeholderTextColor="#777" value={postText} onChangeText={setPostText} />
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#A3C9FF' }]} onPress={() => { if (postText.trim()) { addPost(postText.trim()); setPostText(""); } }}>
              <Ionicons name="send" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {lastNotification ? (
          <View style={styles.toast}><Text style={styles.toastText}>{lastNotification}</Text></View>
        ) : null}

        {showDebug && (
          <View style={{ 
            backgroundColor: '#1a1a1a', 
            padding: 12, 
            margin: 16, 
            borderRadius: 8,
            maxHeight: 200,
          }}>
            <Text style={{ color: '#A3C9FF', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>🔍 Debug Info:</Text>
            <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={true}>
              <Text style={{ color: '#fff', fontSize: 11 }}>Sync: {syncEnabled ? 'true' : 'false'}</Text>
              <Text style={{ color: '#fff', fontSize: 11 }}>WebSocket: {wsEnabled ? 'true' : 'false'}</Text>
              <Text style={{ color: '#fff', fontSize: 11 }}>Token: {token ? 'Yes' : 'No'}</Text>
              <Text style={{ color: '#fff', fontSize: 11 }}>Status: {wsConnectionStatus}</Text>
              <Text style={{ color: '#fff', fontSize: 11 }}>Friends Count: {friends.length}</Text>
              <Text style={{ color: '#fff', fontSize: 11 }}>Token Preview: {token ? token.slice(0, 20) + '...' : 'null'}</Text>
              <Text style={{ color: '#fff', fontSize: 11, lineHeight: 14 }}>Friends Data: {JSON.stringify(friends, null, 2)}</Text>
              <Text style={{ color: '#A3C9FF', fontSize: 11, marginTop: 8 }}>Array.isArray: {Array.isArray(friends) ? 'true' : 'false'}</Text>
              <Text style={{ color: '#A3C9FF', fontSize: 11 }}>Length: {friends.length}</Text>
              <Text style={{ color: '#A3C9FF', fontSize: 11, marginBottom: 10 }}>Type: {typeof friends}</Text>
            </ScrollView>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0c0c', padding: 16 },
  header: { color: '#fff', fontSize: 22, fontWeight: '700' },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '500', marginTop: 4 },
  section: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#111', color: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#1a1a1a' },
  actionBtn: { backgroundColor: '#B8F1D9', padding: 10, borderRadius: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111', borderRadius: 12, padding: 12, marginBottom: 8 },
  itemText: { color: '#fff' },
  acceptBtn: { backgroundColor: '#B8F1D9', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  rejectBtn: { backgroundColor: '#FFB3BA', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  postCard: { backgroundColor: '#111', borderRadius: 12, padding: 12, marginBottom: 10 },
  postAuthor: { color: '#fff', fontWeight: '800' },
  postText: { color: '#e5e5e5', marginTop: 6 },
  topCard: { backgroundColor: '#111', borderRadius: 12, padding: 10, borderColor: '#222', borderWidth: 1, marginTop: 8 },
  topCardText: { color: '#fff', fontWeight: '800' },
  dotOnline: { width: 10, height: 10, borderRadius: 6, backgroundColor: '#3DDC84' },
  dotOffline: { width: 10, height: 10, borderRadius: 6, backgroundColor: '#444' },
  toast: { position: 'absolute', bottom: 100, left: 24, right: 24, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 12, alignItems: 'center' },
  toastText: { color: '#000', fontWeight: '800' },
});
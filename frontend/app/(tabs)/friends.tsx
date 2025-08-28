import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useFriends } from "../../src/context/FriendsContext";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useRuntimeConfig } from "../../src/context/RuntimeConfigContext";
import { api } from "../../src/lib/api";
import { Toast } from "../../src/components/Toast";

export default function FriendsScreen() {
  const { friends, requests, posts, sendRequest, acceptRequest, rejectRequest, addPost, reactPost, refresh } = useFriends();
  const { syncEnabled } = useRuntimeConfig();
  const [friendQuery, setFriendQuery] = React.useState("");
  const [postText, setPostText] = React.useState("");
  const [toast, setToast] = React.useState<{ visible: boolean; text: string }>({ visible: false, text: "" });
  const prevReqCount = React.useRef<number>(requests.length);

  React.useEffect(() => { refresh(); }, [refresh]);

  React.useEffect(() => {
    if (requests.length > prevReqCount.current) {
      setToast({ visible: true, text: "New friend request arrived" });
      setTimeout(() => setToast({ visible: false, text: "" }), 1200);
    }
    prevReqCount.current = requests.length;
  }, [requests.length]);

  const addFriend = async () => {
    const q = friendQuery.trim();
    if (!q) return;
    try {
      if (syncEnabled) {
        if (q.includes("@")) {
          await sendRequest(q);
          setToast({ visible: true, text: `Request sent to ${q}` });
        } else {
          const res = await api.get("/friends/find", { params: { q } });
          const email = res.data?.user?.email;
          if (!email) throw new Error("No email associated");
          await sendRequest(email);
          setToast({ visible: true, text: `Request sent to ${res.data.user.name || email}` });
        }
      } else {
        await sendRequest(q);
        setToast({ visible: true, text: `Request queued for ${q}` });
      }
    } catch (e: any) {
      setToast({ visible: true, text: e?.response?.data?.detail || "User not found" });
    } finally {
      setTimeout(() => setToast({ visible: false, text: "" }), 1400);
      setFriendQuery("");
    }
  };

  const onAccept = async (id: string) => {
    await acceptRequest(id);
    setToast({ visible: true, text: "Friend added" });
    setTimeout(() => setToast({ visible: false, text: "" }), 1000);
  };

  const onReject = async (id: string) => {
    await rejectRequest(id);
    setToast({ visible: true, text: "Request rejected" });
    setTimeout(() => setToast({ visible: false, text: "" }), 1000);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.header}>Friends {syncEnabled ? "(Online)" : "(Local)"}</Text>

        <View style={styles.row}>
          <TextInput style={styles.input} placeholder="Add by name or email" placeholderTextColor="#777" value={friendQuery} onChangeText={setFriendQuery} />
          <TouchableOpacity style={styles.actionBtn} onPress={addFriend}>
            <Ionicons name="person-add" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {requests.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.section}>Requests</Text>
            {requests.map((r) => (
              <View key={r.id} style={styles.itemRow}>
                <Text style={styles.itemText}>{r.from}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(r.id)}>
                    <Text style={{ color: '#000', fontWeight: '700' }}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => onReject(r.id)}>
                    <Text style={{ color: '#000', fontWeight: '700' }}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ marginTop: 16 }}>
          <Text style={styles.section}>My Friends</Text>
          <FlashList
            data={friends}
            keyExtractor={(f) => f.id}
            estimatedItemSize={60}
            renderItem={({ item }) => (
              <View style={styles.itemRow}><Text style={styles.itemText}>{item.name}{item.email ? ` (${item.email})` : ''}</Text></View>
            )}
            contentContainerStyle={{ paddingBottom: 12 }}
          />
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

        <View style={{ marginTop: 10, flex: 1 }}>
          <Text style={styles.section}>Friends Feed</Text>
          <FlashList
            data={posts}
            keyExtractor={(p) => p.id}
            estimatedItemSize={120}
            renderItem={({ item }) => (
              <View style={styles.postCard}>
                <Text style={styles.postAuthor}>{item.author}</Text>
                <Text style={styles.postText}>{item.text}</Text>
                <View style={styles.reacts}>
                  <TouchableOpacity style={styles.reactBtn} onPress={() => reactPost(item.id, 'like')}><Ionicons name="thumbs-up" size={18} color="#B8F1D9" /><Text style={styles.reactCount}>{item.reactions.like || 0}</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.reactBtn} onPress={() => reactPost(item.id, 'heart')}><Ionicons name="heart" size={18} color="#FF7CA3" /><Text style={styles.reactCount}>{item.reactions.heart || 0}</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.reactBtn} onPress={() => reactPost(item.id, 'clap')}><Ionicons name="hand-right" size={18} color="#7C9EFF" /><Text style={styles.reactCount}>{item.reactions.clap || 0}</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.reactBtn} onPress={() => reactPost(item.id, 'star')}><Ionicons name="star" size={18} color="#FFE3A3" /><Text style={styles.reactCount}>{item.reactions.star || 0}</Text></TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>

        <Toast visible={toast.visible} text={toast.text} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0c0c', padding: 16 },
  header: { color: '#fff', fontSize: 22, fontWeight: '700' },
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
  reacts: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  reactBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reactCount: { color: '#bdbdbd' },
});
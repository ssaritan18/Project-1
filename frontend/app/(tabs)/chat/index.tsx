import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useChat } from "../../../src/context/ChatContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function ChatList() {
  const { chats, createGroup, joinByCode } = useChat();
  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");

  const openChat = (id: string) => router.push(`/(tabs)/chat/${id}`);

  const create = () => {
    if (!title.trim()) return;
    const id = createGroup(title.trim(), ["You"]);
    setTitle("");
    openChat(id);
  };

  const join = () => {
    if (!code.trim()) return;
    const id = joinByCode(code.trim());
    setCode("");
    if (id) openChat(id);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.header}>Chats & Groups</Text>
        <View style={styles.newRow}>
          <TextInput style={styles.input} placeholder="New group title" placeholderTextColor="#777" value={title} onChangeText={setTitle} />
          <TouchableOpacity style={styles.createBtn} onPress={create}>
            <Ionicons name="add" size={20} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={styles.newRow}>
          <TextInput style={styles.input} placeholder="Join by invite code" placeholderTextColor="#777" value={code} onChangeText={setCode} />
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: '#FFE3A3' }]} onPress={join}>
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
                <Text style={styles.meta}>Members: {item.members.join(", ")}</Text>
                <Text style={styles.meta}>Invite code: {item.inviteCode}</Text>
              </View>
              {item.unread ? (
                <View style={styles.badge}><Text style={styles.badgeText}>{item.unread}</Text></View>
              ) : null}
              <Ionicons name="chevron-forward" color="#888" size={18} />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0c0c', padding: 16 },
  header: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  newRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#111', color: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#1a1a1a' },
  createBtn: { backgroundColor: '#B8F1D9', padding: 10, borderRadius: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111', borderRadius: 16, padding: 12, marginBottom: 10 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  meta: { color: '#bdbdbd', marginTop: 4 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#FFCFE1', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginRight: 6 },
  badgeText: { color: '#000', fontSize: 12, fontWeight: '800' },
});
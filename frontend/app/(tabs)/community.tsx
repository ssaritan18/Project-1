import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

const SAMPLE = [
  { id: "1", name: "Ava", progress: 0.7 },
  { id: "2", name: "Mia", progress: 0.45 },
  { id: "3", name: "Zoe", progress: 0.9 },
  { id: "4", name: "Noah", progress: 0.3 },
];

export default function CommunityScreen() {
  const [items, setItems] = React.useState(SAMPLE);
  const [comment, setComment] = React.useState("");

  const sendComment = (name: string) => {
    if (!comment.trim()) return;
    setComment("");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          estimatedItemSize={120}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={require("../../assets/images/icon.png")} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${(item.progress * 100).toFixed(0)}%` }]} />
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                  <TouchableOpacity style={styles.emojiBtn}><Text style={styles.emoji}>👍</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.emojiBtn}><Text style={styles.emoji}>🔥</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.emojiBtn}><Text style={styles.emoji}>🎉</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListHeaderComponent={() => <Text style={styles.header}>Community</Text>}
        />

        <View style={styles.footer}>
          <TextInput
            style={styles.input}
            placeholder="Send a short encouragement..."
            placeholderTextColor="#777"
            value={comment}
            onChangeText={setComment}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => sendComment("friend")}>
            <Ionicons name="send" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c0c" },
  header: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 12 },
  card: { flexDirection: "row", backgroundColor: "#111", borderRadius: 16, padding: 12, marginBottom: 12, alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  name: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 8 },
  progressTrack: { height: 10, backgroundColor: "#222", borderRadius: 8, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 8, backgroundColor: "#FFCFE1" },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: '#111', flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  input: { flex: 1, backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#222' },
  sendBtn: { backgroundColor: '#B8F1D9', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  emojiBtn: { padding: 6 },
  emoji: { fontSize: 18 },
});
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { api } from "../../src/lib/api";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/auth";

interface CommunityCard {
  user_id: string;
  name?: string;
  photo_base64?: string | null;
  ratio: number;
  total_progress: number;
  total_goal: number;
}

export default function CommunityScreen() {
  const [items, setItems] = React.useState<CommunityCard[]>([]);
  const [loading, setLoading] = React.useState(false);
  const { palette } = useAuthStore();

  const fetchCommunity = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/users/community");
      setItems(res.data.users || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCommunity();
  }, [fetchCommunity]);

  const reactToUser = async (to_user_id: string, type: "like" | "clap" | "star") => {
    try {
      await api.post("/reactions", { to_user_id, type });
      Alert.alert("Sent!", "Your encouragement was sent.");
    } catch (e) {
      Alert.alert("Oops", "Couldn't send reaction.");
    }
  };

  return (
    <View style={styles.container}>
      <FlashList
        data={items}
        onRefresh={fetchCommunity}
        refreshing={loading}
        keyExtractor={(item) => item.user_id}
        estimatedItemSize={120}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image
              source={item.photo_base64 ? { uri: `data:image/png;base64,${item.photo_base64}` } : require("../../assets/images/icon.png")}
              style={styles.avatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name || "Friend"}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(item.ratio * 100).toFixed(0)}%`, backgroundColor: palette.secondary }]} />
              </View>
              <Text style={styles.meta}>{item.total_progress} / {item.total_goal}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => reactToUser(item.user_id, "like")}> 
                <Ionicons name="heart" color="#FF7CA3" size={22} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => reactToUser(item.user_id, "clap")}> 
                <Ionicons name="hand-right" color="#7C9EFF" size={22} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => reactToUser(item.user_id, "star")}> 
                <Ionicons name="star" color="#FFD27C" size={22} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListHeaderComponent={() => <Text style={styles.header}>Community</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c0c" },
  header: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 12 },
  card: { flexDirection: "row", backgroundColor: "#111", borderRadius: 16, padding: 12, marginBottom: 12, alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  name: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 8 },
  progressTrack: { height: 10, backgroundColor: "#222", borderRadius: 8, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 8 },
  meta: { color: "#bdbdbd", marginTop: 6, fontSize: 12 },
  actions: { marginLeft: 8, gap: 8 },
  iconBtn: { padding: 6 },
});
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../src/lib/api";
import { useAuthStore, Palette } from "../../src/store/auth";
import { ProgressBar } from "../../src/components/ProgressBar";

const PRESETS: Palette[] = [
  { primary: "#A3C9FF", secondary: "#FFCFE1", accent: "#B8F1D9" },
  { primary: "#FFB3BA", secondary: "#BAE1FF", accent: "#BFFCC6" },
  { primary: "#F6C5FF", secondary: "#C9F7F5", accent: "#FFE3A3" },
];

export default function ProfileScreen() {
  const { userId, palette, name } = useAuthStore();
  const [me, setMe] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchMe = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get("/me");
      setMe(res.data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "We need access to your gallery.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (!result.canceled && result.assets?.[0]?.base64) {
      try {
        await api.patch("/me", { photo_base64: result.assets[0].base64 });
        fetchMe();
      } catch (e) {
        Alert.alert("Error", "Could not update photo");
      }
    }
  };

  const applyPalette = async (p: Palette) => {
    try {
      await api.patch("/me", { palette: p });
      useAuthStore.setState({ palette: p });
      fetchMe();
    } catch (e) {
      Alert.alert("Error", "Could not update palette");
    }
  };

  const ratio = me?.today?.ratio || 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.headerRow}>
          <Image source={me?.photo_base64 ? { uri: `data:image/png;base64,${me.photo_base64}` } : require("../../assets/images/icon.png")} style={styles.avatar} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>{me?.name || name || "You"}</Text>
            <Text style={styles.meta}>Streak: {me?.streak || 0} days</Text>
            <TouchableOpacity style={[styles.photoBtn, { backgroundColor: palette.primary }]} onPress={pickPhoto}>
              <Text style={styles.photoBtnText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <ProgressBar progress={ratio} color={palette.accent} height={16} />
          <Text style={styles.meta}>{me?.today?.total_progress || 0} / {me?.today?.total_goal || 0}</Text>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Personalize</Text>
          <Text style={styles.meta}>Pick a pastel palette</Text>
          <View style={styles.paletteRow}>
            {PRESETS.map((p, idx) => (
              <TouchableOpacity key={idx} style={styles.paletteItem} onPress={() => applyPalette(p)}>
                <View style={[styles.swatch, { backgroundColor: p.primary }]} />
                <View style={[styles.swatch, { backgroundColor: p.secondary }]} />
                <View style={[styles.swatch, { backgroundColor: p.accent }]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c0c" },
  headerRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  name: { color: "#fff", fontSize: 20, fontWeight: "700" },
  meta: { color: "#bdbdbd", marginTop: 6 },
  photoBtn: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, alignSelf: "flex-start" },
  photoBtnText: { color: "#0c0c0c", fontWeight: "700" },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 10 },
  paletteRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  paletteItem: { backgroundColor: "#111", padding: 10, borderRadius: 12, flexDirection: "row", gap: 8 },
  swatch: { width: 20, height: 20, borderRadius: 6 },
});
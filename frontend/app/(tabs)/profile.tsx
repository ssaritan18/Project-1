import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { useTasks } from "../../src/context/TasksContext";
import { ProgressBar } from "../../src/components/ProgressBar";
import { useStreak } from "../../src/hooks/useStreak";
import { useFocusEffect } from "@react-navigation/native";
import { makeBackup, restoreBackup, resetAll } from "../../src/utils/backup";

const PRESETS = [
  { primary: "#A3C9FF", secondary: "#FFCFE1", accent: "#B8F1D9" },
  { primary: "#FFB3BA", secondary: "#BAE1FF", accent: "#BFFCC6" },
  { primary: "#F6C5FF", secondary: "#C9F7F5", accent: "#FFE3A3" },
];

export default function ProfileScreen() {
  const { user, signOut, palette, setPalette } = useAuth();
  const { tasks } = useTasks();
  const total = tasks.reduce((a, t) => a + t.goal, 0);
  const done = tasks.reduce((a, t) => a + t.progress, 0);
  const ratio = total ? done / total : 0;
  const { streak, refresh } = useStreak();

  useFocusEffect(React.useCallback(() => { refresh(); }, [refresh]));

  const onBackup = async () => {
    try {
      await makeBackup();
    } catch (e) {
      Alert.alert("Backup failed", "Could not create backup file.");
    }
  };

  const onRestore = async () => {
    try {
      const ok = await restoreBackup();
      Alert.alert(ok ? "Restored" : "Cancelled", ok ? "Data restored. Please restart the app to see changes." : "No file selected.");
    } catch (e) {
      Alert.alert("Restore failed", "Invalid file or read error.");
    }
  };

  const onReset = async () => {
    Alert.alert("Reset all data?", "This will clear tasks, chats, friends, posts, and theme.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: async () => { await resetAll(); Alert.alert("Cleared", "Local data has been removed"); } },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <Text style={styles.title}>{user?.name || "You"}</Text>
      <Text style={styles.meta}>Streak: {streak} days</Text>

      <View style={{ marginTop: 16 }}>
        <Text style={styles.sectionTitle}>Overall Progress</Text>
        <ProgressBar progress={ratio} color={palette.accent} height={16} />
        <Text style={styles.meta}>{done} / {total}</Text>
      </View>

      <View style={{ marginTop: 24 }}>
        <Text style={styles.sectionTitle}>Personalize</Text>
        <View style={styles.paletteRow}>
          {PRESETS.map((p, i) => (
            <TouchableOpacity key={i} style={styles.paletteItem} onPress={() => setPalette(p)}>
              <View style={[styles.swatch, { backgroundColor: p.primary }]} />
              <View style={[styles.swatch, { backgroundColor: p.secondary }]} />
              <View style={[styles.swatch, { backgroundColor: p.accent }]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ marginTop: 24, gap: 12 }}>
        <Text style={styles.sectionTitle}>Data Tools</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#A3C9FF' }]} onPress={onBackup}>
          <Text style={styles.btnTextDark}>Backup to JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#B8F1D9' }]} onPress={onRestore}>
          <Text style={styles.btnTextDark}>Restore from JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#FFCFE1' }]} onPress={onReset}>
          <Text style={styles.btnTextDark}>Reset Demo Data</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: palette.primary }]} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c0c" },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  meta: { color: "#bdbdbd", marginTop: 6 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 10 },
  paletteRow: { flexDirection: "row", justifyContent: "space-between" },
  paletteItem: { backgroundColor: "#111", padding: 10, borderRadius: 12, flexDirection: "row", gap: 8 },
  swatch: { width: 20, height: 20, borderRadius: 6 },
  btn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnTextDark: { color: '#0c0c0c', fontWeight: '800' },
  signOutBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  signOutText: { color: '#0c0c0c', fontWeight: '700' },
});
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, DevSettings, Switch } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { useTasks } from "../../src/context/TasksContext";
import { ProgressBar } from "../../src/components/ProgressBar";
import { useStreak } from "../../src/hooks/useStreak";
import { useFocusEffect } from "@react-navigation/native";
import { makeBackup, restoreBackup, resetAll } from "../../src/utils/backup";
import { router } from "expo-router";
import { useRuntimeConfig } from "../../src/context/RuntimeConfigContext";
import { api } from "../../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// New ADHD-friendly components
import { AchievementBadge } from "../../src/components/AchievementBadge";
import { StreakVisualization } from "../../src/components/StreakVisualization";
import { ProfileStatistics } from "../../src/components/ProfileStatistics";
import { ProfileCompletionGuide } from "../../src/components/ProfileCompletionGuide";
import { useAchievements } from "../../src/hooks/useAchievements";

const PRESETS = [
  { primary: "#A3C9FF", secondary: "#FFCFE1", accent: "#B8F1D9" },
  { primary: "#FFB3BA", secondary: "#BAE1FF", accent: "#BFFCC6" },
  { primary: "#F6C5FF", secondary: "#C9F7F5", accent: "#FFE3A3" },
];

export default function ProfileScreen() {
  console.log("🏠 ProfileScreen rendering...");
  const { user, signOut, palette, setPalette, token } = useAuth();
  const { syncEnabled, setSyncEnabled, wsEnabled, setWsEnabled } = useRuntimeConfig();
  const insets = useSafeAreaInsets();
  const { tasks } = useTasks();
  const total = tasks.reduce((a, t) => a + t.goal, 0);
  const done = tasks.reduce((a, t) => a + t.progress, 0);
  const ratio = total ? done / total : 0;
  const { streak, refresh } = useStreak();

  useFocusEffect(React.useCallback(() => { refresh(); }, [refresh]));
  
  const navigateToEdit = () => {
    router.push('/profile/edit');
  };

  const navigateToSettings = () => {
    router.push('/profile/settings');
  };

  const onBackup = async () => { try { await makeBackup(); } catch { Alert.alert("Backup failed", "Could not create backup file."); } };
  const onRestore = async () => {
    try {
      const ok = await restoreBackup();
      if (ok) { Alert.alert("Restored", "Data restored. The app will reload now.", [ { text: "OK", onPress: () => { try { DevSettings.reload(); } catch {} } } ]); }
      else { Alert.alert("Cancelled", "No file selected."); }
    } catch { Alert.alert("Restore failed", "Invalid file or read error."); }
  };
  const onReset = async () => { Alert.alert("Reset all data?", "This will clear tasks, chats, friends, posts, and theme.", [ { text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: async () => { await resetAll(); Alert.alert("Cleared", "Local data has been removed"); } } ]); };

  const onToggleSync = async (v: boolean) => {
    if (v) {
      await setSyncEnabled(true);
      if (!token) {
        Alert.alert("Online mode enabled", "Please log in (online) to sync.", [
          { text: "Later", style: "cancel" },
          { text: "Log In", onPress: () => router.push('/(auth)/login') }
        ]);
      }
    } else {
      await setSyncEnabled(false);
      Alert.alert("Local mode", "App is now running offline (local-only)");
    }
  };

  const seedDemo = async () => {
    if (!syncEnabled || !token) {
      Alert.alert("Enable Online mode", "Turn on Sync Mode and log in online to seed demo users.");
      return;
    }
    try {
      const res = await api.post("/dev/seed-demo");
      const users = res.data?.users || [];
      const lines = users.map((u: any) => `${u.name} — ${u.email} / ${u.password}`).join("\n");
      Alert.alert("Demo users seeded", lines || "Seed complete.");
    } catch (e: any) {
      Alert.alert("Seed failed", e?.response?.data?.detail || "Please try again.");
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]} 
      contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 180) }}
    >
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
        <Text style={styles.sectionTitle}>Profile Management</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#4A90E2' }]} onPress={navigateToEdit}>
          <Text style={styles.btnTextLight}>✏️ Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#6C5CE7' }]} onPress={navigateToSettings}>
          <Text style={styles.btnTextLight}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 24, gap: 12 }}>
        <Text style={styles.sectionTitle}>Data Tools</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#A3C9FF' }]} onPress={onBackup}><Text style={styles.btnTextDark}>Backup to JSON</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#B8F1D9' }]} onPress={onRestore}><Text style={styles.btnTextDark}>Restore from JSON</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#FFCFE1' }]} onPress={onReset}><Text style={styles.btnTextDark}>Reset Demo Data</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#E1FFA3' }]} onPress={seedDemo}><Text style={styles.btnTextDark}>Seed Demo Users</Text></TouchableOpacity>
      </View>

      <View style={{ marginTop: 24 }}>
        <Text style={styles.sectionTitle}>Sync Mode</Text>
        <View style={styles.syncRow}>
          <Text style={styles.meta}>{syncEnabled ? 'Online' : 'Local'}</Text>
          <Switch value={syncEnabled} onValueChange={onToggleSync} />
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <Text style={styles.sectionTitle}>Realtime (WebSocket)</Text>
        <View style={styles.syncRow}>
          <Text style={styles.meta}>WS {wsEnabled ? 'On' : 'Off'}</Text>
          <Switch value={wsEnabled} onValueChange={setWsEnabled} />
        </View>
      </View>

      {/* DEBUG: Simple test button */}
      <TouchableOpacity 
        style={{ backgroundColor: 'red', padding: 20, margin: 10, alignItems: 'center' }}
        onPress={() => Alert.alert("TEST", "Simple button works!")}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>TEST BUTTON</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: palette.primary }]} onPress={async () => {
        console.log("🚪 Sign Out button clicked!");
        Alert.alert("Debug", "Sign Out button works!");
        await signOut();
        router.replace("/(auth)/welcome");
      }}>
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
  btnTextLight: { color: '#fff', fontWeight: '800' },
  signOutBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  signOutText: { color: '#0c0c0c', fontWeight: '700' },
  syncRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
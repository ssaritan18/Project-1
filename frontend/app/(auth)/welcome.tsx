import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";

export default function WelcomeAuth() {
  const { signIn } = useAuth();

  const handleOfflineContinue = async () => {
    console.log("🔄 Offline continue clicked - signing in offline user");
    try {
      // Sign in with a default offline user
      await signIn({ name: "ADHD User", email: "offline@adhders.app" });
      console.log("✅ Offline sign in successful, redirecting to tabs");
      router.replace("/(tabs)/");
    } catch (error) {
      console.error("❌ Error signing in offline:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ADHDers Social Club</Text>
      <Text style={styles.subtitle}>Choose a path to continue</Text>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#6C5CE7' }]} onPress={() => router.push('/onboarding')}>
        <Text style={styles.btnTextDark}>🧠 Take ADHD Assessment</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#A3C9FF' }]} onPress={() => router.push('/(auth)/signup')}>
        <Text style={styles.btnTextDark}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#B8F1D9' }]} onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.btnTextDark}>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btnGhost]} onPress={handleOfflineContinue}>
        <Text style={styles.btnGhostText}>Continue (offline)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0c0c', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#d1d1d1', marginBottom: 24 },
  btn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 240, alignItems: 'center', marginTop: 10 },
  btnTextDark: { color: '#0c0c0c', fontWeight: '800' },
  btnGhost: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 240, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#333' },
  btnGhostText: { color: '#fff', fontWeight: '700' },
});
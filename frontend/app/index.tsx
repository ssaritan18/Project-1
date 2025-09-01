import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { router, useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
  const { isAuthed, user, token } = useAuth();

  useEffect(() => {
    console.log("🔍 Index auth state check:", { isAuthed, hasUser: !!user, hasToken: !!token });
    
    // Immediate navigation - no timeout to prevent race conditions
    if (isAuthed && user) {
      console.log("✅ User authenticated, redirecting to tabs");
      router.replace("/(tabs)");
    } else {
      console.log("❌ User not authenticated, redirecting to welcome");
      router.replace("/(auth)/welcome");
    }
    
  }, [isAuthed, user, token]); // Added user and token as dependencies

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#A3C9FF" />
      <Text style={styles.text}>ADHDers Social Club</Text>
      <Text style={styles.subtext}>
        {isAuthed ? "Welcome back! 👋" : "Loading... 🚀"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0c0c0c" },
  text: { color: "#fff", marginTop: 8, fontWeight: "700" },
  subtext: { color: "#888", marginTop: 4, fontSize: 12, fontStyle: "italic" },
});
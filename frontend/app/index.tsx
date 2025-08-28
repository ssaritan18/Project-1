import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
  const { isAuthed } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => {
      if (isAuthed) router.replace("/(tabs)");
      else router.replace("/(auth)/login");
    }, 800); // tiny splash
    return () => clearTimeout(t);
  }, [isAuthed]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#A3C9FF" />
      <Text style={styles.text}>Adhers Social Club</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0c0c0c" },
  text: { color: "#fff", marginTop: 8, fontWeight: "700" },
});
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../src/store/auth";

export default function Index() {
  const { isAuthenticated, bootstrap } = useAuthStore();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#7C9EFF" />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0c0c0c" },
  text: { color: "#bdbdbd", marginTop: 8 },
});
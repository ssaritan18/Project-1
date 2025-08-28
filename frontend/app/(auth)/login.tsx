import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { router } from "expo-router";
import { useAuthStore } from "../../src/store/auth";

WebBrowser.maybeCompleteAuthSession();

// NOTE: You must provide Google OAuth client IDs in app.json under expo.extra.google
const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export default function Login() {
  const { signInWithGoogle, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      <Image source={require("../../assets/images/app-image.png")} style={styles.image} />
      <Text style={styles.title}>Adhers Social Club</Text>
      <Text style={styles.subtitle}>Motivate your day with tiny wins</Text>

      <TouchableOpacity style={styles.googleBtn} onPress={signInWithGoogle}>
        <Text style={styles.googleText}>Continue with Google</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>We use your Google account to create your profile. No spam.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c0c", alignItems: "center", justifyContent: "center", padding: 24 },
  image: { width: 180, height: 180, resizeMode: "contain", marginBottom: 16 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#d1d1d1", fontSize: 14, marginBottom: 24 },
  googleBtn: { backgroundColor: "#fff", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 240, alignItems: "center" },
  googleText: { color: "#000", fontSize: 16, fontWeight: "600" },
  disclaimer: { color: "#a1a1a1", fontSize: 12, marginTop: 16, textAlign: "center" },
});
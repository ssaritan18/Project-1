import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, Alert } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { router } from "expo-router";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { signIn, login, resetCredentials } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const validEmail = useMemo(() => emailRegex.test(email.trim()), [email]);

  const submit = async () => {
    if (!validEmail) {
      Alert.alert("Invalid email", "Please enter a valid email (e.g., test@example.com)");
      return;
    }
    if (password.trim().length > 0) {
      await login(email, password);
    } else {
      await signIn({ name, email });
    }
    router.replace("/(tabs)");
  };

  const submitMockGoogle = async () => {
    await signIn({ name: name || "Google User", email });
    router.replace("/(tabs)");
  };

  const forgot = async () => {
    if (!validEmail) {
      Alert.alert("Enter email", "Type your email first, then tap Forgot PIN.");
      return;
    }
    Alert.alert("Reset PIN?", "This will clear your saved PIN for this email.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: async () => { await resetCredentials(email); router.push({ pathname: '/(auth)/signup', params: { email } }); } },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>ADHDers Social Club</Text>
        <Text style={styles.subtitle}>Motivate your day with tiny wins</Text>

        <View style={styles.inputBox}>
          <Text style={styles.label}>Name (optional)</Text>
          <TextInput style={styles.input} placeholder="Jane" placeholderTextColor="#777" value={name} onChangeText={setName} returnKeyType="next" />
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="jane@example.com" placeholderTextColor="#777" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} returnKeyType="next" />
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.label}>PIN/Password (optional)</Text>
          <TextInput style={styles.input} placeholder="••••" placeholderTextColor="#777" secureTextEntry value={password} onChangeText={setPassword} returnKeyType="done" onSubmitEditing={submit} />
        </View>

        <TouchableOpacity style={[styles.primaryBtn, !validEmail && styles.disabledBtn]} onPress={submit} disabled={!validEmail}>
          <Text style={[styles.primaryText, !validEmail && styles.disabledText]}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.googleBtn} onPress={submitMockGoogle}>
          <Text style={styles.googleText}>Continue with Google (mock)</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={forgot} style={{ marginTop: 12 }}>
          <Text style={{ color: '#A3C9FF', fontWeight: '700' }}>Forgot PIN?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c0c", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#d1d1d1", fontSize: 14, marginBottom: 24 },
  inputBox: { width: "100%", maxWidth: 360, marginBottom: 12 },
  label: { color: "#bdbdbd", marginBottom: 6 },
  input: { backgroundColor: "#111", color: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#1a1a1a" },
  primaryBtn: { backgroundColor: "#A3C9FF", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 240, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#0c0c0c", fontWeight: "700" },
  disabledBtn: { opacity: 0.5 },
  disabledText: { color: "#333" },
  googleBtn: { backgroundColor: "#fff", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 240, alignItems: "center", marginTop: 12 },
  googleText: { color: "#000", fontWeight: "700" },
});
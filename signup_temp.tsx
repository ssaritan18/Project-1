import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, Alert } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { router, useLocalSearchParams } from "expo-router";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUp() {
  const { register } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (params?.email && typeof params.email === 'string') setEmail(params.email);
  }, [params?.email]);

  const valid = useMemo(() => emailRegex.test(email.trim()) && (password.trim().length >= 4), [email, password]);

  const submit = async () => {
    if (!valid) {
      Alert.alert("Invalid", "Enter a valid email and a PIN/password (min 4 chars)");
      return;
    }
    await register(name, email, password);
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Create your tester account</Text>
        <Text style={styles.subtitle}>Offline-only. Stored locally on your device.</Text>

        <View style={styles.inputBox}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} placeholder="Jane" placeholderTextColor="#777" value={name} onChangeText={setName} returnKeyType="next" />
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="jane@example.com" placeholderTextColor="#777" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} returnKeyType="next" />
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.label}>PIN/Password</Text>
          <TextInput style={styles.input} placeholder="••••" placeholderTextColor="#777" secureTextEntry value={password} onChangeText={setPassword} returnKeyType="done" onSubmitEditing={submit} />
        </View>

        <TouchableOpacity style={[styles.primaryBtn, !valid && styles.disabledBtn]} onPress={submit} disabled={!valid}>
          <Text style={[styles.primaryText, !valid && styles.disabledText]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c0c", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: "#d1d1d1", fontSize: 12, marginBottom: 24 },
  inputBox: { width: "100%", maxWidth: 360, marginBottom: 12 },
  label: { color: "#bdbdbd", marginBottom: 6 },
  input: { backgroundColor: "#111", color: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#1a1a1a" },
  primaryBtn: { backgroundColor: "#A3C9FF", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 240, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#0c0c0c", fontWeight: "700" },
  disabledBtn: { opacity: 0.5 },
  disabledText: { color: "#333" },
});
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput } from "react-native";
import { useAuth } from "../../src/context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Adhers Social Club</Text>
        <Text style={styles.subtitle}>Motivate your day with tiny wins</Text>

        <View style={styles.inputBox}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} placeholder="Jane" placeholderTextColor="#777" value={name} onChangeText={setName} />
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="jane@example.com" placeholderTextColor="#777" keyboardType="email-address" value={email} onChangeText={setEmail} />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => signIn({ name, email })}>
          <Text style={styles.primaryText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.googleBtn} onPress={() => signIn({ name: name || "Google User", email })}>
          <Text style={styles.googleText}>Continue with Google (mock)</Text>
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
  googleBtn: { backgroundColor: "#fff", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 240, alignItems: "center", marginTop: 12 },
  googleText: { color: "#000", fontWeight: "700" },
});
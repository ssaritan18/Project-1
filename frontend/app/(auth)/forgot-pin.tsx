import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, Alert } from "react-native";
import { router } from "expo-router";
import { api } from "../../src/lib/api";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPin() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPin = async () => {
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: email.trim() });
      
      Alert.alert(
        "Reset Email Sent! 📧",
        "If this email exists in our system, you will receive a password reset link shortly. Please check your email.",
        [
          {
            text: "OK",
            onPress: () => router.back()
          }
        ]
      );
      
    } catch (error) {
      console.error("Forgot PIN error:", error);
      Alert.alert("Error", "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Forgot Your PIN?</Text>
        <Text style={styles.subtitle}>Enter your email address and we'll send you a link to reset your password.</Text>

        <View style={styles.inputBox}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder="your-email@example.com" 
            placeholderTextColor="#777" 
            keyboardType="email-address" 
            autoCapitalize="none" 
            autoCorrect={false} 
            value={email} 
            onChangeText={setEmail} 
            returnKeyType="done" 
            onSubmitEditing={handleForgotPin}
          />
        </View>

        <TouchableOpacity 
          style={[styles.primaryBtn, loading && styles.disabledBtn]} 
          onPress={handleForgotPin} 
          disabled={loading || !emailRegex.test(email.trim())}
        >
          <Text style={[styles.primaryText, loading && styles.disabledText]}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c0c", justifyContent: "center", paddingHorizontal: 24 },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#aaa", textAlign: "center", marginBottom: 32, lineHeight: 22 },
  inputBox: { marginBottom: 16 },
  label: { fontSize: 14, color: "#fff", marginBottom: 6, fontWeight: "600" },
  input: { backgroundColor: "#1a1a1a", color: "#fff", padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: "#333" },
  primaryBtn: { backgroundColor: "#A3C9FF", paddingVertical: 16, borderRadius: 12, marginTop: 24 },
  primaryText: { color: "#0c0c0c", fontWeight: "bold", fontSize: 16, textAlign: "center" },
  disabledBtn: { backgroundColor: "#444" },
  disabledText: { color: "#888" },
  backBtn: { marginTop: 16, paddingVertical: 12 },
  backText: { color: "#A3C9FF", textAlign: "center", fontSize: 16, fontWeight: "600" },
});

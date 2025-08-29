import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../src/lib/api";

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isValid = password.length >= 4 && password === confirmPassword;

  const handleResetPassword = async () => {
    if (!params.token) {
      Alert.alert("Error", "Invalid reset token");
      return;
    }

    if (!isValid) {
      Alert.alert("Invalid Input", "Password must be at least 4 characters and match confirmation");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", { 
        token: params.token,
        new_password: password 
      });
      
      Alert.alert(
        "Password Reset Successful! ✅",
        "Your password has been reset successfully. You can now log in with your new password.",
        [
          {
            text: "Go to Login",
            onPress: () => router.replace("/(auth)/login")
          }
        ]
      );
      
    } catch (error) {
      console.error("Reset password error:", error);
      Alert.alert("Error", "Failed to reset password. The token may be expired or invalid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Reset Your Password</Text>
        <Text style={styles.subtitle}>Enter your new password below.</Text>

        <View style={styles.inputBox}>
          <Text style={styles.label}>New Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter new password" 
            placeholderTextColor="#777" 
            secureTextEntry 
            value={password} 
            onChangeText={setPassword} 
            returnKeyType="next" 
          />
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Confirm new password" 
            placeholderTextColor="#777" 
            secureTextEntry 
            value={confirmPassword} 
            onChangeText={setConfirmPassword} 
            returnKeyType="done" 
            onSubmitEditing={handleResetPassword}
          />
        </View>

        {password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword && (
          <Text style={styles.errorText}>Passwords do not match</Text>
        )}

        <TouchableOpacity 
          style={[styles.primaryBtn, (!isValid || loading) && styles.disabledBtn]} 
          onPress={handleResetPassword} 
          disabled={!isValid || loading}
        >
          <Text style={[styles.primaryText, (!isValid || loading) && styles.disabledText]}>
            {loading ? "Resetting..." : "Reset Password"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/(auth)/login")}>
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
  errorText: { color: "#ff6b6b", fontSize: 14, marginTop: -8, marginBottom: 16 },
  primaryBtn: { backgroundColor: "#A3C9FF", paddingVertical: 16, borderRadius: 12, marginTop: 24 },
  primaryText: { color: "#0c0c0c", fontWeight: "bold", fontSize: 16, textAlign: "center" },
  disabledBtn: { backgroundColor: "#444" },
  disabledText: { color: "#888" },
  backBtn: { marginTop: 16, paddingVertical: 12 },
  backText: { color: "#A3C9FF", textAlign: "center", fontSize: 16, fontWeight: "600" },
});

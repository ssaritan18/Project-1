import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, Alert } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
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

  const valid = useMemo(() => 
    emailRegex.test(email.trim()) && 
    name.trim().length >= 2 && 
    password.trim().length >= 4, 
  [email, name, password]);

  const submit = async () => {
    if (!valid) {
      Alert.alert("Invalid Input", "Please fill all fields:\n• Valid email\n• Name (min 2 chars)\n• PIN/Password (min 4 chars)");
      return;
    }
    await register(name.trim(), email.trim(), password.trim());
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#8B5CF6', '#A855F7']}
        style={styles.container}
      >
        <Text style={styles.glowTitle}>Create your tester account</Text>
        <Text style={styles.glowSubtitle}>Offline-only. Stored locally on your device.</Text>

        <View style={styles.glowInputBox}>
          <Text style={styles.glowLabel}>Name</Text>
          <TextInput style={styles.glowInput} placeholder="Jane" placeholderTextColor="#B9B9B9" value={name} onChangeText={setName} returnKeyType="next" />
        </View>
        <View style={styles.glowInputBox}>
          <Text style={styles.glowLabel}>Email</Text>
          <TextInput style={styles.glowInput} placeholder="jane@example.com" placeholderTextColor="#B9B9B9" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} returnKeyType="next" />
        </View>
        <View style={styles.glowInputBox}>
          <Text style={styles.glowLabel}>PIN/Password</Text>
          <TextInput style={styles.glowInput} placeholder="••••" placeholderTextColor="#B9B9B9" secureTextEntry value={password} onChangeText={setPassword} returnKeyType="done" onSubmitEditing={submit} />
        </View>

        <TouchableOpacity onPress={submit} disabled={!valid}>
          <LinearGradient colors={!valid ? ['#666', '#555'] : ['#EC4899', '#F97316']} style={styles.glowBtn}>
            <Text style={styles.glowBtnText}>Sign Up</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.glowBackBtn} onPress={() => router.back()}>
          <Text style={styles.glowBackText}>Back to Welcome</Text>
        </TouchableOpacity>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    padding: 24 
  },
  glowTitle: { 
    color: "#fff", 
    fontSize: 28, 
    fontWeight: "900", 
    marginBottom: 8,
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  glowSubtitle: { 
    color: "#E5E7EB", 
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  glowInputBox: { 
    width: "100%", 
    maxWidth: 360, 
    marginBottom: 16 
  },
  glowLabel: { 
    color: "#E5E7EB", 
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  glowInput: { 
    backgroundColor: "rgba(255, 255, 255, 0.1)", 
    color: "#fff", 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    borderWidth: 1, 
    borderColor: "rgba(139, 92, 246, 0.3)",
    fontSize: 16,
  },
  glowBtn: { 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    borderRadius: 16, 
    minWidth: 260, 
    alignItems: "center", 
    marginTop: 24,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  glowBtnText: { 
    color: "#fff", 
    fontWeight: "800",
    fontSize: 16,
  },
  glowBackBtn: { 
    backgroundColor: "transparent", 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    borderRadius: 16, 
    minWidth: 260, 
    alignItems: "center", 
    marginTop: 16, 
    borderWidth: 2, 
    borderColor: "rgba(139, 92, 246, 0.5)",
  },
  glowBackText: { 
    color: "#E5E7EB", 
    fontWeight: "600",
    fontSize: 16,
  },
});
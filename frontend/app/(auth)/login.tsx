import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, TextInput, Alert, Switch } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REMEMBER_EMAIL_KEY = "@adhd_app_remembered_email";

export default function Login() {
  const { signIn, login, resetCredentials } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validEmail = useMemo(() => {
    const result = emailRegex.test(email.trim());
    console.log("📧 EMAIL VALIDATION:", { email, result, trimmed: email.trim() });
    return result;
  }, [email]);

  // Load saved email on component mount
  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem(REMEMBER_EMAIL_KEY);
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (error) {
        console.log("Failed to load saved email:", error);
      }
    };
    loadSavedEmail();
  }, []);

  const submit = async () => {
    console.log("🚀 LOGIN SUBMIT CALLED", { email, password: password ? "***" : "", validEmail });
    
    if (!validEmail) {
      console.log("❌ Invalid email, showing alert");
      Alert.alert("Geçersiz Email", "Lütfen geçerli bir email girin (örn: test@example.com)");
      return;
    }
    
    console.log("✅ Email valid, starting login process");
    setIsLoading(true);
    
    try {
      console.log("💾 Saving email preference...");
      // Save email if remember me is checked
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      } else {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
      
      console.log("🔐 Calling auth function...");
      if (password.trim().length > 0) {
        console.log("📡 Using login with password");
        await login(email, password);
      } else {
        console.log("📱 Using signIn without password");
        await signIn({ name, email });
      }
      
      console.log("✅ Auth successful, navigating...");
      router.replace("/(tabs)");
    } catch (error) {
      console.error("❌ LOGIN ERROR:", error);
      Alert.alert("Giriş Hatası", `Error: ${error.message || 'Email/şifre kontrol edin ve tekrar deneyin'}`);
    } finally {
      setIsLoading(false);
      console.log("🏁 Login process completed");
    }
  };

  const submitMockGoogle = async () => {
    setIsLoading(true);
    try {
      await signIn({ name: name || "Google User", email });
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Giriş Hatası", "Google girişinde sorun oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = async () => {
    await resetCredentials();
    Alert.alert("Sıfırlandı", "Tüm veriler sıfırlandı");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ADHDers Social Club</Text>
          <Text style={styles.subtitle}>Welcome! Login or create a new account</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: validEmail ? '#B8F1D9' : '#333' }]}
            placeholder="Enter your email address"
            placeholderTextColor="#777"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />

          <Text style={styles.label}>İsim (İsteğe Bağlı)</Text>
          <TextInput
            style={styles.input}
            placeholder="Adınızı girin"
            placeholderTextColor="#777"
            value={name}
            onChangeText={setName}
            editable={!isLoading}
          />

          <Text style={styles.label}>Şifre (Varsa)</Text>
          <TextInput
            style={styles.input}
            placeholder="Şifrenizi girin"
            placeholderTextColor="#777"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          {/* Remember Me */}
          <View style={styles.rememberRow}>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: '#333', true: '#B8F1D9' }}
              thumbColor={rememberMe ? '#000' : '#666'}
            />
            <Text style={styles.rememberText}>Email adresimi hatırla</Text>
          </View>

          {/* Submit Button - Web Compatible */}
          <View style={[styles.submitBtn, { opacity: validEmail && !isLoading ? 1 : 0.5 }]}>
            <button
              type="button"
              onClick={() => {
                console.log("🚨 BUTTON CLICKED - HTML HANDLER", { validEmail, isLoading });
                submit();
              }}
              disabled={!validEmail || isLoading}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#000',
                fontSize: 16,
                fontWeight: '700',
                cursor: validEmail && !isLoading ? 'pointer' : 'not-allowed',
                outline: 'none',
              }}
            >
              {isLoading ? (
                "Logging in..."
              ) : (
                password ? 'Login' : 'Quick Login'
              )}
            </button>
          </View>

          {/* Alternative Actions */}
          <View style={styles.alternativeActions}>
            <button
              onClick={submitMockGoogle}
              disabled={!validEmail || isLoading}
              style={{
                backgroundColor: '#FFE3A3',
                flexDirection: 'row',
                alignItems: 'center',
                padding: '12px 20px',
                borderRadius: '25px',
                border: 'none',
                cursor: 'pointer',
                marginVertical: '4px',
                minWidth: '160px',
                justifyContent: 'center',
                opacity: (!validEmail || isLoading) ? 0.5 : 1
              }}
            >
              <span style={{ marginRight: '8px' }}>🌐</span>
              <span style={{ color: '#000', fontSize: '14px', fontWeight: '600' }}>Login with Google</span>
            </button>

            <button
              onClick={reset}
              disabled={isLoading}
              style={{
                backgroundColor: '#FFCFE1',
                flexDirection: 'row',
                alignItems: 'center',
                padding: '12px 20px',
                borderRadius: '25px',
                border: 'none',
                cursor: 'pointer',
                marginVertical: '4px',
                minWidth: '160px',
                justifyContent: 'center',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <span style={{ marginRight: '8px' }}>🔄</span>
              <span style={{ color: '#000', fontSize: '14px', fontWeight: '600' }}>Reset Data</span>
            </button>
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            <button 
              onClick={() => router.push("/(auth)/signup")}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                marginVertical: '8px'
              }}
            >
              <span style={{ color: '#4A90E2', fontSize: '14px', textDecoration: 'underline' }}>
                Don't have an account? Sign up
              </span>
            </button>
            
            <button 
              onClick={() => router.push("/(auth)/forgot-pin")}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                marginVertical: '8px'
              }}
            >
              <span style={{ color: '#4A90E2', fontSize: '14px', textDecoration: 'underline' }}>
                Şifremi Unuttum
              </span>
            </button>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0c0c0c',
    justifyContent: 'center'
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  title: { 
    color: '#fff', 
    fontSize: 28, 
    fontWeight: '800', 
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    color: '#A3C9FF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20
  },
  form: {
    paddingHorizontal: 24,
  },
  label: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 8, 
    marginTop: 16 
  },
  input: {
    backgroundColor: '#111',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 15,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  rememberText: {
    color: '#A3C9FF',
    fontSize: 14,
    marginLeft: 12,
  },
  submitBtn: { 
    backgroundColor: '#B8F1D9', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    marginTop: 24,
    elevation: 2,
  },
  submitText: { 
    color: '#000', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  alternativeActions: {
    marginTop: 16,
    gap: 12,
  },
  altBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  altBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  navigation: {
    alignItems: 'center',
    marginTop: 32,
    gap: 16,
  },
  linkText: {
    color: '#A3C9FF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

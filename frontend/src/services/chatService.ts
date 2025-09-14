import { Alert } from "react-native";
import { router } from "expo-router";
import { getAuthToken } from "../utils/authTokenHelper";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const uploadImage = async (chatId: string, file: File | any) => {
  const token = await getAuthToken();
  
  if (!token) {
    console.error("❌ No auth token available, cannot upload");
    Alert.alert(
      "Authentication Required",
      "Please login to upload media.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => router.push("/(auth)/login") }
      ]
    );
    return null;
  }

  console.log("🔍 About to call uploadImage with:", {
    token: "Available",
    chatId,
    fileSize: file.size || "unknown"
  });

  const formData = new FormData();
  formData.append("file", file);

  try {
    const uploadUrl = `${BACKEND_URL}/api/chats/${chatId}/upload`;
    console.log("📤 Starting upload to:", uploadUrl);
    console.log("🔍 Upload details:", { chatId, fileName: file.name, fileSize: file.size, tokenAvailable: !!token });
    
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}` 
      },
      body: formData,
    });
    
    console.log("📡 Upload response status:", res.status);
    console.log("📡 Upload response headers:", [...res.headers.entries()]);

    if (res.status === 401) {
      Alert.alert(
        "Session Expired",
        "Please login again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => router.push("/(auth)/login") }
        ]
      );
      return null;
    }

    if (!res.ok) {
      let errorMessage = "Upload failed";
      try {
        const errorData = await res.json();
        errorMessage = errorData.detail || errorData.message || `Upload failed: ${res.status}`;
      } catch {
        errorMessage = `Upload failed: ${res.status}`;
      }
      throw new Error(errorMessage);
    }
    
    const result = await res.json();
    console.log("✅ Upload successful:", result);
    return result;
    
  } catch (err: any) {
    console.error("💥 Upload error:", err);
    Alert.alert("Upload Error", err.message || "Upload failed. Please try again.");
    return null;
  }
};

export const sendMessage = async (chatId: string, text: string) => {
  const token = await getAuthToken();
  
  if (!token) {
    console.error("❌ No token available, cannot send message");
    Alert.alert(
      "Authentication Required",
      "Please login to send messages.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => router.push("/(auth)/login") }
      ]
    );
    return false;
  }

  console.log("🔍 About to send message with:", {
    token: "Available",
    chatId,
    textLength: text.length
  });

  try {
    console.log("📨 Sending message to:", `${BACKEND_URL}/api/chats/${chatId}/message`);
    
    const res = await fetch(`${BACKEND_URL}/api/chats/${chatId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });

    if (res.status === 401) {
      Alert.alert(
        "Session Expired",
        "Please login again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => router.push("/(auth)/login") }
        ]
      );
      return false;
    }

    if (!res.ok) {
      let errorMessage = "Message send failed";
      try {
        const errorData = await res.json();
        errorMessage = errorData.detail || errorData.message || `Send failed: ${res.status}`;
      } catch {
        errorMessage = `Send failed: ${res.status}`;
      }
      throw new Error(errorMessage);
    }
    
    console.log("✅ Message sent successfully");
    return true;
    
  } catch (err: any) {
    console.error("💥 Message send error:", err);
    Alert.alert("Message Error", err.message || "Failed to send message. Please try again.");
    return false;
  }
};
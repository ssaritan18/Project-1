import * as ImagePicker from "expo-image-picker";
import { Platform, Alert } from "react-native";
import { uploadImage } from "./chatService";

export const pickImageAndUpload = async (token: string | null, chatId: string, onSuccess?: (result: any) => void) => {
  try {
    // İzin kontrolü
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Gallery access permission is required to upload images!");
        return;
      }
    }

    let pickerResult;

    if (Platform.OS === 'web') {
      // Web için file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,video/*';
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          console.log("📁 File selected:", file.name, file.type);
          const result = await uploadImage(token, chatId, file);
          if (result && onSuccess) {
            onSuccess(result);
          }
        }
      };
      input.click();
      return;
    } else {
      // Mobile için ImagePicker
      pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
    }

    if (!pickerResult?.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      const asset = pickerResult.assets[0];
      console.log("📁 Asset selected:", asset.uri);

      // React Native için file object oluştur
      const fileObj = {
        uri: asset.uri,
        type: asset.type === 'image' ? 'image/jpeg' : 'video/mp4',
        name: asset.fileName || `media_${Date.now()}.${asset.type === 'image' ? 'jpg' : 'mp4'}`
      } as any;

      const result = await uploadImage(token, chatId, fileObj);
      if (result && onSuccess) {
        onSuccess(result);
      }
    }
  } catch (error) {
    console.error("💥 Pick and upload error:", error);
    Alert.alert("Error", "Failed to pick and upload media. Please try again.");
  }
};

export const pickCameraAndUpload = async (token: string | null, chatId: string, onSuccess?: (result: any) => void) => {
  try {
    if (Platform.OS === 'web') {
      Alert.alert("Not Supported", "Camera is not supported on web. Please use gallery.");
      return;
    }

    // Kamera izni
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera access permission is required!");
      return;
    }

    const pickerResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      const asset = pickerResult.assets[0];
      console.log("📷 Camera asset:", asset.uri);

      const fileObj = {
        uri: asset.uri,
        type: 'image/jpeg',
        name: `photo_${Date.now()}.jpg`
      } as any;

      const result = await uploadImage(token, chatId, fileObj);
      if (result && onSuccess) {
        onSuccess(result);
      }
    }
  } catch (error) {
    console.error("💥 Camera and upload error:", error);
    Alert.alert("Error", "Failed to take photo and upload. Please try again.");
  }
};
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PanGestureHandler,
  State,
  Animated,
  Dimensions,
  Vibration,
  BackHandler,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: screenWidth } = Dimensions.get('window');
const CANCEL_THRESHOLD = -100; // Pixels to swipe left to cancel

interface VoiceRecorderProps {
  onVoiceRecorded: (audioBase64: string, duration: number) => void;
  onCancel?: () => void;
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
  style?: any;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onVoiceRecorded,
  onCancel,
  onRecordingStart,
  onRecordingEnd,
  style
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [cancelDistance, setCancelDistance] = useState(0);
  const [showCancelHint, setShowCancelHint] = useState(false);
  
  const recording = useRef<Audio.Recording | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const waveformOpacity = useRef(new Animated.Value(0)).current;

  const requestMicrophonePermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      const granted = status === 'granted';
      setIsPermissionGranted(granted);
      
      if (!granted) {
        Alert.alert(
          'Mikrofon İzni Gerekli',
          'Sesli mesaj göndermek için mikrofon iznine ihtiyacımız var.',
          [{ text: 'Tamam' }]
        );
      }
      
      return granted;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return false;
    }
  };

  const startRecording = async () => {
    try {
      // Request permission if not granted
      if (!isPermissionGranted) {
        const granted = await requestMicrophonePermission();
        if (!granted) return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Start recording
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000,
        },
      };

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(recordingOptions);
      await newRecording.startAsync();

      recording.current = newRecording;
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      Alert.alert('Hata', 'Kayıt başlatılamadı. Lütfen tekrar deneyin.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording.current) return;

      // Clear duration interval
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      setIsRecording(false);
      await recording.current.stopAndUnloadAsync();

      // Get recording URI
      const uri = recording.current.getURI();
      if (!uri) {
        throw new Error('No recording URI available');
      }

      // Convert to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      
      // Clean up
      recording.current = null;

      // Send the recorded audio
      onVoiceRecorded(base64, recordingDuration);

    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      Alert.alert('Hata', 'Kayıt durdurulamadı. Lütfen tekrar deneyin.');
      cancelRecording();
    }
  };

  const cancelRecording = async () => {
    try {
      if (recording.current) {
        await recording.current.stopAndUnloadAsync();
        recording.current = null;
      }

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      setIsRecording(false);
      setRecordingDuration(0);
      onCancel?.();
    } catch (error) {
      console.error('❌ Failed to cancel recording:', error);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (data:audio/webm;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, style]}>
      {!isRecording ? (
        <TouchableOpacity 
          style={styles.recordButton} 
          onPress={startRecording}
          activeOpacity={0.8}
        >
          <Ionicons name="mic" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.recordingContainer}>
          <View style={styles.recordingInfo}>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Kaydediliyor...</Text>
            </View>
            <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
          </View>
          
          <View style={styles.recordingControls}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={cancelRecording}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color="#ff4757" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.stopButton} 
              onPress={stopRecording}
              activeOpacity={0.8}
            >
              <Ionicons name="stop" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4757',
    marginRight: 8,
  },
  recordingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  durationText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#333',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stopButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VoiceRecorder;
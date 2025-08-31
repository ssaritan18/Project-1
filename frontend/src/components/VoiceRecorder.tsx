import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Animated,
  Dimensions,
  Vibration,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

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
  
  const recording = useRef<Audio.Recording | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

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
      if (!isPermissionGranted) {
        const granted = await requestMicrophonePermission();
        if (!granted) return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

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
      onRecordingStart?.();

      if (Platform.OS === 'ios') {
        Vibration.vibrate(50);
      }

      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      Alert.alert('Hata', 'Kayıt başlatılamadı. Lütfen tekrar deneyin.');
    }
  };

  const stopRecording = async (shouldSend: boolean = true) => {
    try {
      if (!recording.current) return;

      // Clear animations and intervals
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      stopWaveformAnimation();
      
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(waveformOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      setIsRecording(false);
      setCancelDistance(0);
      setShowCancelHint(false);
      onRecordingEnd?.();

      await recording.current.stopAndUnloadAsync();

      if (shouldSend && recordingDuration > 0) {
        // Get recording URI
        const uri = recording.current.getURI();
        if (!uri) {
          throw new Error('No recording URI available');
        }

        // Convert to base64
        const response = await fetch(uri);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        
        // Send the recorded audio
        onVoiceRecorded(base64, recordingDuration);
      } else {
        onCancel?.();
      }

      // Clean up
      recording.current = null;
      setRecordingDuration(0);

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

      stopWaveformAnimation();
      
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(waveformOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      setIsRecording(false);
      setRecordingDuration(0);
      setCancelDistance(0);
      setShowCancelHint(false);
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

  // Gesture handler for swipe to cancel
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!isRecording) return;
      
      const translation = Math.min(0, event.translationX);
      translateX.setValue(translation);
      setCancelDistance(translation);
      
      const shouldShowHint = translation < CANCEL_THRESHOLD / 2;
      if (shouldShowHint !== showCancelHint) {
        setShowCancelHint(shouldShowHint);
        if (shouldShowHint && Platform.OS === 'ios') {
          Vibration.vibrate(25);
        }
      }
    })
    .onEnd((event) => {
      if (!isRecording) return;
      
      if (event.translationX < CANCEL_THRESHOLD) {
        // Cancelled
        cancelRecording();
      } else {
        // Reset position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        setCancelDistance(0);
        setShowCancelHint(false);
      }
    });

  const WaveformBars = () => (
    <Animated.View style={[styles.waveformContainer, { opacity: waveformOpacity }]}>
      {waveforms.map((wave, index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveformBar,
            {
              height: wave.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 20],
              }),
            },
          ]}
        />
      ))}
    </Animated.View>
  );

  if (!isRecording) {
    return (
      <TouchableOpacity 
        style={[styles.recordButton, style]}
        onLongPress={startRecording}
        activeOpacity={0.8}
        delayLongPress={150}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="mic" size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.recordingContainer, style]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View 
          style={[
            styles.recordingUI,
            { 
              transform: [{ translateX }],
              backgroundColor: showCancelHint ? '#ff4757' : '#2a2a2a',
            }
          ]}
        >
          <View style={styles.recordingContent}>
            <View style={styles.recordingIndicator}>
              <Animated.View style={[styles.recordingDot, { transform: [{ scale }] }]} />
              <Text style={styles.recordingText}>
                {showCancelHint ? 'Release to cancel' : 'Recording...'}
              </Text>
            </View>
            
            <WaveformBars />
            
            <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.stopButton} 
            onPress={() => stopRecording(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="stop" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
      
      {showCancelHint && (
        <View style={styles.cancelHint}>
          <Ionicons name="arrow-back" size={16} color="#ff4757" />
          <Text style={styles.cancelHintText}>Slide to cancel</Text>
        </View>
      )}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  recordButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingContainer: {
    position: 'relative',
    width: '100%',
  },
  recordingUI: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 200,
  },
  recordingContent: {
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
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    height: 24,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#4A90E2',
    borderRadius: 2,
    marginHorizontal: 1,
  },
  durationText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
  },
  stopButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  cancelHint: {
    position: 'absolute',
    top: -30,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cancelHintText: {
    color: '#ff4757',
    fontSize: 12,
    marginLeft: 4,
  },
});

export default VoiceRecorder;
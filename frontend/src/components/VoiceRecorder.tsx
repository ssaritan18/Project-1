import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

type VoiceRecorderProps = {
  onRecordingComplete: (audioUri: string, duration: number) => void;
  onCancel?: () => void;
  maxDuration?: number; // in seconds
  minDuration?: number; // in seconds
  style?: any;
  size?: 'small' | 'medium' | 'large';
  color?: string;
};

const { width } = Dimensions.get('window');

export function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 60, // 1 minute max
  minDuration = 1, // 1 second min
  style,
  size = 'medium',
  color = '#4A90E2'
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Timer ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Size configurations
  const sizes = {
    small: { container: 40, icon: 18 },
    medium: { container: 56, icon: 24 },
    large: { container: 72, icon:32 }
  };
  
  const currentSize = sizes[size];

  useEffect(() => {
    requestPermissions();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      startAnimations();
      startTimer();
    } else {
      stopAnimations();
      stopTimer();
    }
  }, [isRecording]);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'This app needs microphone access to record voice messages. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to request audio permissions:', error);
      setHasPermission(false);
    }
  };

  const startAnimations = () => {
    // Pulse animation for recording button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Wave animation for visual feedback
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();

    // Scale animation for press feedback
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const stopAnimations = () => {
    pulseAnim.stopAnimation();
    waveAnim.stopAnimation();
    pulseAnim.setValue(1);
    waveAnim.setValue(0);
    
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const startTimer = () => {
    setDuration(0);
    intervalRef.current = setInterval(() => {
      setDuration(prev => {
        const newDuration = prev + 1;
        if (newDuration >= maxDuration) {
          stopRecording();
        }
        return newDuration;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startRecording = async () => {
    if (hasPermission !== true) {
      await requestPermissions();
      return;
    }

    try {
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and start recording
      const { recording: newRecording } = await Audio.Recording.createAsync({
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
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert(
        'Recording Error',
        'Failed to start recording. Please check your microphone permissions and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      const uri = recording.getURI();
      if (uri && duration >= minDuration) {
        onRecordingComplete(uri, duration);
      } else if (duration < minDuration) {
        Alert.alert(
          'Recording Too Short',
          `Voice message must be at least ${minDuration} second${minDuration > 1 ? 's' : ''} long.`,
          [{ text: 'OK' }]
        );
        onCancel?.();
      }
      
      setRecording(null);
      setDuration(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const cancelRecording = async () => {
    if (recording) {
      try {
        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        setRecording(null);
        setDuration(0);
        onCancel?.();
      } catch (error) {
        console.error('Failed to cancel recording:', error);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDurationColor = () => {
    if (duration >= maxDuration * 0.9) return '#FF3547'; // Red for almost max
    if (duration >= maxDuration * 0.7) return '#FF6B35'; // Orange for warning
    return '#FFFFFF'; // White for normal
  };

  if (hasPermission === false) {
    return (
      <TouchableOpacity 
        style={[styles.container, style, { width: currentSize.container, height: currentSize.container }]}
        onPress={requestPermissions}
      >
        <Ionicons name="mic-off" size={currentSize.icon} color="#666" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.recordingContainer, style]}>
      {isRecording && (
        <View style={styles.recordingUI}>
          {/* Wave visualization */}
          <View style={styles.waveContainer}>
            {[...Array(5)].map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveBars,
                  {
                    height: waveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, 20 + Math.random() * 10]
                    }),
                    backgroundColor: color,
                    opacity: waveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1]
                    })
                  }
                ]}
              />
            ))}
          </View>
          
          {/* Duration display */}
          <Text style={[styles.durationText, { color: getDurationColor() }]}>
            {formatDuration(duration)}
          </Text>
          
          {/* Cancel button */}
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={cancelRecording}
          >
            <Ionicons name="close" size={20} color="#FF3547" />
          </TouchableOpacity>
          
          {/* Stop button */}
          <TouchableOpacity 
            style={[styles.stopButton, { backgroundColor: color }]}
            onPress={stopRecording}
          >
            <Ionicons name="stop" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {!isRecording && (
        <Animated.View
          style={[
            styles.container,
            {
              width: currentSize.container,
              height: currentSize.container,
              backgroundColor: color,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.recordButton}
            onPress={startRecording}
            activeOpacity={0.8}
          >
            <Animated.View
              style={[
                styles.pulseContainer,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Ionicons name="mic" size={currentSize.icon} color="#FFFFFF" />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  recordingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recordButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingUI: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: width * 0.7,
    gap: 12,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  waveBars: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#4A90E2',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minWidth: 40,
    textAlign: 'center',
  },
  cancelButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 53, 71, 0.2)',
  },
  stopButton: {
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
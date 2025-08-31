import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';

type VoicePlayerProps = {
  voiceUrl: string;
  duration?: number; // duration in seconds
  isOwnMessage?: boolean;
  onPlaybackStatusUpdate?: (isPlaying: boolean, position: number, duration: number) => void;
  style?: any;
};

export function VoicePlayer({
  voiceUrl,
  duration = 0,
  isOwnMessage = false,
  onPlaybackStatusUpdate,
  style
}: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration * 1000); // Convert to milliseconds
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Animation refs
  const waveAnims = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0.3))
  ).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  useEffect(() => {
    if (isPlaying) {
      startWaveAnimation();
    } else {
      stopWaveAnimation();
    }
  }, [isPlaying]);

  const startWaveAnimation = () => {
    const animations = waveAnims.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.8 + Math.random() * 0.4,
            duration: 400 + Math.random() * 200,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3 + Math.random() * 0.3,
            duration: 400 + Math.random() * 200,
            useNativeDriver: true,
          }),
        ])
      );
    });

    animations.forEach((animation, index) => {
      setTimeout(() => animation.start(), index * 50);
    });
  };

  const stopWaveAnimation = () => {
    waveAnims.forEach(anim => {
      anim.stopAnimation();
      Animated.timing(anim, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const playPauseSound = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        await loadAndPlaySound();
      }
      
      // Button press animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('Playback Error', 'Failed to play voice message. Please try again.');
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const loadAndPlaySound = async () => {
    setIsLoading(true);
    
    try {
      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: voiceUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading sound:', error);
      Alert.alert('Load Error', 'Failed to load voice message. Please check your connection.');
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setCurrentPosition(status.positionMillis || 0);
      setTotalDuration(status.durationMillis || totalDuration);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setCurrentPosition(0);
        onPlaybackStatusUpdate?.(false, 0, totalDuration / 1000);
      } else {
        onPlaybackStatusUpdate?.(
          isPlaying,
          (status.positionMillis || 0) / 1000,
          (status.durationMillis || totalDuration) / 1000
        );
      }
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (totalDuration === 0) return 0;
    return (currentPosition / totalDuration) * 100;
  };

  const getButtonColor = () => {
    return isOwnMessage ? '#000000' : '#FFFFFF';
  };

  const getBackgroundColor = () => {
    return isOwnMessage ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
  };

  const getTextColor = () => {
    return isOwnMessage ? '#000000' : '#FFFFFF';
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }, style]}>
      {/* Play/Pause Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: getBackgroundColor() }]}
          onPress={playPauseSound}
          disabled={isLoading}
        >
          {isLoading ? (
            <Ionicons name="hourglass" size={20} color={getButtonColor()} />
          ) : isPlaying ? (
            <Ionicons name="pause" size={20} color={getButtonColor()} />
          ) : (
            <Ionicons name="play" size={20} color={getButtonColor()} />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Waveform Visualization */}
      <View style={styles.waveformContainer}>
        {waveAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.waveBar,
              {
                opacity: anim,
                height: isPlaying 
                  ? 16 + Math.sin(index * 0.5) * 8 
                  : 8 + Math.sin(index * 0.3) * 4,
                backgroundColor: getTextColor(),
              }
            ]}
          />
        ))}
        
        {/* Progress overlay */}
        <View 
          style={[
            styles.progressOverlay,
            {
              width: `${getProgressPercentage()}%`,
              backgroundColor: isOwnMessage ? 'rgba(74, 144, 226, 0.7)' : 'rgba(163, 201, 255, 0.7)'
            }
          ]}
        />
      </View>

      {/* Duration */}
      <View style={styles.durationContainer}>
        <Text style={[styles.durationText, { color: getTextColor() }]}>
          {isPlaying || currentPosition > 0 
            ? formatTime(currentPosition)
            : formatTime(totalDuration)
          }
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 200,
    gap: 12,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    gap: 2,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 2,
  },
  waveBar: {
    flex: 1,
    borderRadius: 1,
    minHeight: 2,
  },
  progressOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  durationContainer: {
    minWidth: 35,
    alignItems: 'flex-end',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
});
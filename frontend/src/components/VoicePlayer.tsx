import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface VoicePlayerProps {
  voiceUrl: string;
  duration?: number;
  style?: any;
  author?: string;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({
  voiceUrl,
  duration = 0,
  style,
  author
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const sound = useRef<Audio.Sound | null>(null);
  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (sound.current) {
        sound.current.unloadAsync();
      }
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
    };
  }, []);

  const loadAudio = async () => {
    try {
      if (sound.current) {
        await sound.current.unloadAsync();
        sound.current = null;
      }

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and load sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: voiceUrl },
        { shouldPlay: false }
      );

      sound.current = newSound;

      // Set up status update
      sound.current.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setCurrentPosition(status.positionMillis || 0);
          if (!totalDuration && status.durationMillis) {
            setTotalDuration(Math.floor(status.durationMillis / 1000));
          }
          
          if (status.didJustFinish) {
            setIsPlaying(false);
            setCurrentPosition(0);
            if (positionUpdateInterval.current) {
              clearInterval(positionUpdateInterval.current);
              positionUpdateInterval.current = null;
            }
          }
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to load audio:', error);
      Alert.alert('Hata', 'Ses dosyası yüklenemedi.');
      return false;
    }
  };

  const playPauseAudio = async () => {
    try {
      if (isLoading) return;

      setIsLoading(true);

      // Load audio if not loaded
      if (!sound.current) {
        const loaded = await loadAudio();
        if (!loaded) {
          setIsLoading(false);
          return;
        }
      }

      if (isPlaying) {
        // Pause audio
        await sound.current!.pauseAsync();
        setIsPlaying(false);
        if (positionUpdateInterval.current) {
          clearInterval(positionUpdateInterval.current);
          positionUpdateInterval.current = null;
        }
      } else {
        // Play audio
        await sound.current!.playAsync();
        setIsPlaying(true);
        
        // Start position updates
        positionUpdateInterval.current = setInterval(async () => {
          if (sound.current) {
            const status = await sound.current.getStatusAsync();
            if (status.isLoaded) {
              setCurrentPosition(status.positionMillis || 0);
            }
          }
        }, 100);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('❌ Failed to play/pause audio:', error);
      Alert.alert('Hata', 'Ses çalarken hata oluştu.');
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const seekTo = async (position: number) => {
    try {
      if (sound.current) {
        await sound.current.setPositionAsync(position * 1000);
        setCurrentPosition(position * 1000);
      }
    } catch (error) {
      console.error('❌ Failed to seek audio:', error);
    }
  };

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    if (!totalDuration) return 0;
    return Math.min(currentPosition / (totalDuration * 1000), 1);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={styles.playButton} 
        onPress={playPauseAudio}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <Ionicons name="hourglass" size={20} color="#4A90E2" />
        ) : isPlaying ? (
          <Ionicons name="pause" size={20} color="#4A90E2" />
        ) : (
          <Ionicons name="play" size={20} color="#4A90E2" />
        )}
      </TouchableOpacity>

      <View style={styles.audioInfo}>
        <View style={styles.waveformContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${getProgress() * 100}%` }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>
            {formatTime(currentPosition)}
          </Text>
          {totalDuration > 0 && (
            <Text style={styles.timeText}>
              {formatTime(totalDuration * 1000)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.audioIcon}>
        <Ionicons name="mic" size={16} color="#666" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 200,
    maxWidth: 280,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  waveformContainer: {
    marginBottom: 4,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#444',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  audioIcon: {
    marginLeft: 8,
    opacity: 0.6,
  },
});

export default VoicePlayer;
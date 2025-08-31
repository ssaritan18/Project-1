import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface VoicePlayerProps {
  voiceUrl: string;
  duration?: number;
  style?: any;
  author?: string;
  isFromMe?: boolean;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({
  voiceUrl,
  duration = 0,
  style,
  author,
  isFromMe = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [isDownloaded, setIsDownloaded] = useState(false);
  
  const sound = useRef<Audio.Sound | null>(null);
  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const playButtonScale = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  // Waveform visualization (fake bars for visual appeal)
  const waveformBars = useRef(
    Array.from({ length: 15 }, () => new Animated.Value(Math.random() * 0.5 + 0.3))
  ).current;

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

  const animateWaveform = (isPlaying: boolean) => {
    if (isPlaying) {
      const animations = waveformBars.map((bar) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(bar, {
              toValue: Math.random() * 0.7 + 0.3,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: Math.random() * 0.5 + 0.2,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
          ])
        )
      );
      
      Animated.stagger(50, animations).start();
    } else {
      waveformBars.forEach((bar) => {
        bar.stopAnimation();
        Animated.timing(bar, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }
  };

  const loadAudio = async () => {
    try {
      if (sound.current) {
        await sound.current.unloadAsync();
        sound.current = null;
      }

      setIsLoading(true);

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
        { 
          shouldPlay: false,
          progressUpdateIntervalMillis: 100,
        }
      );

      sound.current = newSound;
      setIsDownloaded(true);

      // Set up status update
      sound.current.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setCurrentPosition(status.positionMillis || 0);
          
          if (!totalDuration && status.durationMillis) {
            setTotalDuration(Math.floor(status.durationMillis / 1000));
          }
          
          // Update progress animation
          if (status.durationMillis && status.durationMillis > 0) {
            const progress = (status.positionMillis || 0) / status.durationMillis;
            progressWidth.setValue(progress);
          }
          
          if (status.didJustFinish) {
            setIsPlaying(false);
            setCurrentPosition(0);
            progressWidth.setValue(0);
            animateWaveform(false);
            
            if (positionUpdateInterval.current) {
              clearInterval(positionUpdateInterval.current);
              positionUpdateInterval.current = null;
            }
          }
        }
      });

      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('❌ Failed to load audio:', error);
      Alert.alert('Hata', 'Ses dosyası yüklenemedi.');
      setIsLoading(false);
      return false;
    }
  };

  const playPauseAudio = async () => {
    try {
      if (isLoading) return;

      // Load audio if not loaded
      if (!sound.current || !isDownloaded) {
        const loaded = await loadAudio();
        if (!loaded) return;
      }

      // Animate play button
      Animated.sequence([
        Animated.timing(playButtonScale, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(playButtonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      if (isPlaying) {
        // Pause audio
        await sound.current!.pauseAsync();
        setIsPlaying(false);
        animateWaveform(false);
        
        if (positionUpdateInterval.current) {
          clearInterval(positionUpdateInterval.current);
          positionUpdateInterval.current = null;
        }
      } else {
        // Play audio
        await sound.current!.playAsync();
        setIsPlaying(true);
        animateWaveform(true);
      }

    } catch (error) {
      console.error('❌ Failed to play/pause audio:', error);
      Alert.alert('Hata', 'Ses çalarken hata oluştu.');
      setIsPlaying(false);
      animateWaveform(false);
    }
  };

  const seekTo = async (position: number) => {
    try {
      if (sound.current && isDownloaded) {
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

  const WaveformBars = () => (
    <View style={styles.waveformContainer}>
      {waveformBars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveformBar,
            {
              height: bar.interpolate({
                inputRange: [0, 1],
                outputRange: [2, 16],
              }),
              backgroundColor: isFromMe ? '#4A90E2' : '#666',
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={[
      styles.container, 
      style,
      { backgroundColor: isFromMe ? '#4A90E2' : '#2a2a2a' }
    ]}>
      <TouchableOpacity 
        style={[
          styles.playButton,
          { backgroundColor: isFromMe ? 'rgba(255,255,255,0.2)' : '#333' }
        ]} 
        onPress={playPauseAudio}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ scale: playButtonScale }] }}>
          {isLoading ? (
            <Ionicons 
              name="hourglass" 
              size={16} 
              color={isFromMe ? '#fff' : '#4A90E2'} 
            />
          ) : isPlaying ? (
            <Ionicons 
              name="pause" 
              size={16} 
              color={isFromMe ? '#fff' : '#4A90E2'} 
            />
          ) : (
            <Ionicons 
              name="play" 
              size={16} 
              color={isFromMe ? '#fff' : '#4A90E2'} 
            />
          )}
        </Animated.View>
      </TouchableOpacity>

      <View style={styles.audioContent}>
        <WaveformBars />
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { 
                  width: progressWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: isFromMe ? '#fff' : '#4A90E2',
                }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.timeContainer}>
          <Text style={[
            styles.timeText,
            { color: isFromMe ? 'rgba(255,255,255,0.8)' : '#888' }
          ]}>
            {formatTime(currentPosition)}
          </Text>
          {totalDuration > 0 && (
            <Text style={[
              styles.timeText,
              { color: isFromMe ? 'rgba(255,255,255,0.6)' : '#666' }
            ]}>
              {formatTime(totalDuration * 1000)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.audioMeta}>
        <Ionicons 
          name="mic" 
          size={12} 
          color={isFromMe ? 'rgba(255,255,255,0.6)' : '#666'} 
        />
        {!isDownloaded && (
          <Ionicons 
            name="download-outline" 
            size={12} 
            color={isFromMe ? 'rgba(255,255,255,0.6)' : '#666'} 
            style={{ marginLeft: 4 }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 180,
    maxWidth: 260,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  audioContent: {
    flex: 1,
    justifyContent: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    marginBottom: 4,
    justifyContent: 'space-between',
  },
  waveformBar: {
    width: 2,
    borderRadius: 1,
    marginHorizontal: 0.5,
  },
  progressContainer: {
    marginBottom: 4,
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  audioMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default VoicePlayer;

export default VoicePlayer;
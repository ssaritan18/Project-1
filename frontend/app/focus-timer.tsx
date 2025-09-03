import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../src/context/SubscriptionContext';
import { MockInterstitialAd } from '../src/components/MockInterstitialAd';

export default function FocusTimer() {
  const { mode, duration } = useLocalSearchParams<{ mode: string; duration: string }>();
  const insets = useSafeAreaInsets();
  const { incrementFocusSession, getFocusSessionsRemaining, subscription } = useSubscription();
  
  const [timeLeft, setTimeLeft] = useState(parseInt(duration || '25') * 60); // Convert to seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((parseInt(duration || '25') * 60 - timeLeft) / (parseInt(duration || '25') * 60)) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsCompleted(true);
            // Show completion alert
            Alert.alert(
              '🎉 Focus Session Complete!',
              'Great job! You completed your ' + mode + ' session.',
              [
                {
                  text: '✨ Awesome!',
                  onPress: () => router.back()
                }
              ]
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode]);

  const handleStart = () => {
    // Check if this is the first start of this session
    if (!sessionStarted) {
      const canStart = incrementFocusSession();
      
      if (!canStart) {
        // Show interstitial ad for limit reached
        setShowInterstitial(true);
        return;
      }
      
      setSessionStarted(true);
    }
    
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(parseInt(duration || '25') * 60);
    setIsCompleted(false);
  };

  const handleStop = () => {
    Alert.alert(
      'Stop Focus Session?',
      'Are you sure you want to stop your focus session?',
      [
        { text: 'Continue', style: 'cancel' },
        { 
          text: 'Stop', 
          style: 'destructive',
          onPress: () => router.back()
        }
      ]
    );
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'Pomodoro': return '🍅';
      case 'Deep Work': return '🧠';
      case 'ADHD Sprint': return '⚡';
      default: return '🎯';
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case 'Pomodoro': return '#F97316';
      case 'Deep Work': return '#8B5CF6';
      case 'ADHD Sprint': return '#10B981';
      default: return '#4A90E2';
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f172a']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Glow Header */}
      <LinearGradient
        colors={getModeGradient()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.glowHeader}
      >
        <TouchableOpacity 
          onPress={handleStop}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {getModeIcon()} {mode} Mode
        </Text>
        
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {/* Timer Display */}
      <View style={styles.timerContainer}>
        {/* Circular Progress */}
        <View style={styles.progressContainer}>
          <LinearGradient
            colors={getModeGradient()}
            style={[styles.progressCircle]}
          >
            <View style={styles.progressInner}>
              <View style={styles.timerDisplay}>
                <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
                <Text style={styles.timeLabel}>
                  {isCompleted ? '🎉 Completed!' : isRunning ? '🔥 Focus Time' : '⚡ Ready to Focus'}
                </Text>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={getModeGradient()}
                    style={[styles.progressFill, { width: `${progress}%` }]}
                  />
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isCompleted && (
          <>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={handleReset}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.controlButtonGradient}
              >
                <Ionicons name="refresh" size={24} color="#fff" />
                <Text style={styles.controlButtonText}>Reset</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.primaryControlButton} 
              onPress={isRunning ? handlePause : handleStart}
            >
              <LinearGradient
                colors={getModeGradient()}
                style={styles.primaryButtonGradient}
              >
                <Ionicons name={isRunning ? "pause" : "play"} size={32} color="#fff" />
                <Text style={styles.primaryButtonText}>{isRunning ? 'Pause' : 'Start'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={handleStop}
            >
              <LinearGradient
                colors={['rgba(220, 38, 38, 0.8)', 'rgba(185, 28, 28, 0.8)']}
                style={styles.controlButtonGradient}
              >
                <Ionicons name="stop" size={24} color="#fff" />
                <Text style={styles.controlButtonText}>Stop</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
        
        {isCompleted && (
          <TouchableOpacity 
            style={styles.primaryControlButton} 
            onPress={() => router.back()}
          >
            <LinearGradient
              colors={['#10B981', '#34D399']}
              style={styles.primaryButtonGradient}
            >
              <Ionicons name="checkmark" size={32} color="#fff" />
              <Text style={styles.primaryButtonText}>✨ Complete!</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.1)']}
          style={styles.statsCard}
        >
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{Math.ceil(progress)}%</Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{duration}m</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </LinearGradient>
      </View>
      
      {/* Feature Unlock Interstitial */}
      <MockInterstitialAd
        visible={showInterstitial}
        onClose={() => {
          setShowInterstitial(false);
          router.back();
        }}
        adType="feature_unlock"
        context={{
          featureName: 'Focus Sessions',
          limitReached: `You've used all 3 focus sessions today (${subscription.tier === 'free' ? 'Free Plan' : 'Current Plan'})`
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  timerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  modeIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  modeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 40,
  },
  progressCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  progressFill: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    top: 2,
    right: '50%',
    transformOrigin: 'right center',
    borderRadius: 140,
  },
  timerDisplay: {
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  timeLabel: {
    color: '#999',
    fontSize: 16,
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingVertical: 30,
  },
  controlButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minWidth: 80,
  },
  resetButton: {
    backgroundColor: '#374151',
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
  },
  stopButton: {
    backgroundColor: '#DC2626',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
});
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FocusTimer() {
  const { mode, duration } = useLocalSearchParams<{ mode: string; duration: string }>();
  const insets = useSafeAreaInsets();
  
  const [timeLeft, setTimeLeft] = useState(parseInt(duration || '25') * 60); // Convert to seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleStop} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode} Mode</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Timer Display */}
      <View style={styles.timerContainer}>
        <Text style={styles.modeIcon}>{getModeIcon()}</Text>
        <Text style={styles.modeTitle}>{mode}</Text>
        
        {/* Circular Progress */}
        <View style={[styles.progressCircle, { borderColor: getModeColor() }]}>
          <View style={[styles.progressFill, { 
            backgroundColor: getModeColor(),
            transform: [{ rotate: `${(progress * 3.6)}deg` }]
          }]} />
          <View style={styles.timerDisplay}>
            <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.timeLabel}>
              {isCompleted ? 'Completed!' : isRunning ? 'Focus Time' : 'Ready to Focus'}
            </Text>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isCompleted && (
          <>
            <TouchableOpacity 
              style={[styles.controlButton, styles.resetButton]} 
              onPress={handleReset}
            >
              <Ionicons name="refresh" size={24} color="#fff" />
              <Text style={styles.controlButtonText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.primaryButton, { backgroundColor: getModeColor() }]} 
              onPress={isRunning ? handlePause : handleStart}
            >
              <Ionicons name={isRunning ? "pause" : "play"} size={32} color="#fff" />
              <Text style={styles.primaryButtonText}>{isRunning ? 'Pause' : 'Start'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.stopButton]} 
              onPress={handleStop}
            >
              <Ionicons name="stop" size={24} color="#fff" />
              <Text style={styles.controlButtonText}>Stop</Text>
            </TouchableOpacity>
          </>
        )}
        
        {isCompleted && (
          <TouchableOpacity 
            style={[styles.controlButton, styles.primaryButton, { backgroundColor: getModeColor() }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="checkmark" size={32} color="#fff" />
            <Text style={styles.primaryButtonText}>Complete!</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{Math.ceil(progress)}%</Text>
          <Text style={styles.statLabel}>Progress</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{duration}m</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
      </View>
    </View>
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
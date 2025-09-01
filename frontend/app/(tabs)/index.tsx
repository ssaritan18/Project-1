import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal, Alert, ScrollView } from "react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import { useTasks } from "../../src/context/TasksContext";
import { useAuth } from "../../src/context/AuthContext";
import { TaskCard } from "../../src/components/TaskCard";
import { ProgressBar } from "../../src/components/ProgressBar";
import { Ionicons } from "@expo/vector-icons";
import { Celebration } from "../../src/components/Celebration";
import { Confetti } from "../../src/components/Confetti";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SegmentedProgressBar } from "../../src/components/SegmentedProgressBar";
import { FocusModeTimer } from "../../src/components/FocusModeTimer";
import { WeeklyChallenges } from "../../src/components/WeeklyChallenges";
import { FocusSessionTracker } from "../../src/components/FocusSessionTracker";
import { EnhancedCelebration } from "../../src/components/EnhancedCelebration";
import { AchievementBadge } from "../../src/components/AchievementBadge";
import { StreakVisualization } from "../../src/components/StreakVisualization";
import { useChallenges } from "../../src/hooks/useChallenges";
import { useFocusSession } from "../../src/hooks/useFocusSession";
import { usePoints } from "../../src/hooks/usePoints";
import { useAchievements } from "../../src/hooks/useAchievements";
import { useStreak } from "../../src/hooks/useStreak";
import { router } from "expo-router";

const COLOR_PRESETS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];

export default function HomeScreen() {
  console.log("🏠 HomeScreen rendering...");

  const { tasks, increment, addTask, remove, reorder } = useTasks();
  const { palette } = useAuth();
  const insets = useSafeAreaInsets();
  const [taskInput, setTaskInput] = useState("");
  const [showCelebration, setShowCelebration] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  // ADHD-friendly hooks for gamification
  const pointsData = usePoints();
  const achievements = useAchievements();
  const streak = useStreak();
  const challenges = useChallenges();
  const focusSession = useFocusSession();

  // Calculate overall progress for visual motivation
  const overallProgress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.completed).length;
    return Math.round((completedTasks / tasks.length) * 100);
  }, [tasks]);

  // Add New Task Handler (simplified to avoid template literal issues)
  const handleAddTask = () => {
    const taskPrompt = window.prompt("✨ Add New Task", "What would you like to accomplish today?");
    if (taskPrompt && taskPrompt.trim()) {
      // Add task
      addTask(taskPrompt.trim(), 1, COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
      
      // Show rewarding feedback
      if (Platform.OS === 'web') {
        const message = '🎉 Task Created!\n\n"' + taskPrompt.trim() + '" has been added to your quest!\n\n✅ +10 points for planning ahead\n📊 Progress bars updated\n🎯 Ready to tackle it?';
        window.alert(message);
      }
    }
  };

  // Handle starting different focus modes with actual timer
  const handleStartFocusMode = (mode, duration) => {
    Alert.alert(
      "🎯 Start " + mode + "?", 
      "Ready to focus for " + duration + " minutes?",
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: '🚀 Start Focus!', 
          style: 'default',
          onPress: () => {
            // Navigate to focus timer (we'll create this)
            router.push({
              pathname: '/focus-timer',
              params: { mode: mode, duration: duration }
            });
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeTitle}>ADHDers Social Club</Text>
        <Text style={styles.welcomeText}>Your neural network community</Text>
      </View>

      {/* Add New Task Section */}
      <View style={styles.addTaskSection}>
        <TouchableOpacity 
          style={[styles.gradientButton, styles.addTaskButton]}
          onPress={handleAddTask}
        >
          <Text style={styles.gradientButtonText}>✨ Add New Task</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Visualization */}
      {tasks.length > 0 && (
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>📊 Your Progress</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressBarFill, { width: overallProgress + '%' }]} />
            </View>
            <Text style={styles.progressText}>{overallProgress}% Complete</Text>
          </View>
        </View>
      )}

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>2</Text>
          <Text style={styles.statLabel}>🏆 Achievements</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>🔥 Challenges</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>250</Text>
          <Text style={styles.statLabel}>💎 Focus Points</Text>
        </View>
      </View>

      {/* Neurodivergency Hub */}
      <View style={styles.section}>
        <View style={styles.hubContainer}>
          <View style={styles.hubHeader}>
            <Text style={styles.hubIcon}>🧠</Text>
            <Text style={styles.hubTitle}>Neurodivergency Hub</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </View>
          <Text style={styles.hubDescription}>
            Educational content, coping strategies, and community resources for neurodivergent individuals
          </Text>
          <TouchableOpacity style={styles.hubButton}>
            <Text style={styles.hubButtonText}>Coming Soon</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ADHD Focus Mode */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧠 ADHD Focus Mode</Text>
        <Text style={styles.sectionSubtitle}>Choose your focus style based on your current energy and attention span</Text>
        
        <View style={styles.focusModeContainer}>
          <TouchableOpacity 
            style={[styles.focusModeCard, styles.pomodoroCard]}
            onPress={() => handleStartFocusMode('Pomodoro', 25)}
          >
            <Text style={styles.focusModeIcon}>🍅</Text>
            <Text style={styles.focusModeTitle}>Pomodoro</Text>
            <Text style={styles.focusModeSubtitle}>25 min focus</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.focusModeCard, styles.deepWorkCard]}
            onPress={() => handleStartFocusMode('Deep Work', 50)}
          >
            <Text style={styles.focusModeIcon}>🧠</Text>
            <Text style={styles.focusModeTitle}>Deep Work</Text>
            <Text style={styles.focusModeSubtitle}>50 min deep</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.focusModeCard, styles.sprintCard]}
            onPress={() => handleStartFocusMode('ADHD Sprint', 15)}
          >
            <Text style={styles.focusModeIcon}>⚡</Text>
            <Text style={styles.focusModeTitle}>ADHD Sprint</Text>
            <Text style={styles.focusModeSubtitle}>15 min burst</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekly Challenges Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 This Week's Challenge</Text>
        <View style={styles.challengePreview}>
          <Text style={styles.challengeText}>0/3 challenges completed this week</Text>
          <Text style={styles.challengeSubtext}>Keep going! Every challenge helps build your ADHD superpowers 💪</Text>
        </View>
      </View>

      {/* Task List */}
      {tasks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Your Tasks</Text>
          <DraggableFlatList
            data={tasks}
            onDragEnd={({ data }) => reorder(data)}
            keyExtractor={(item) => item.id}
            renderItem={({ item, drag, isActive }) => (
              <ScaleDecorator>
                <TaskCard
                  task={item}
                  onToggle={() => increment(item.id)}
                  onDelete={() => remove(item.id)}
                  onLongPress={drag}
                  disabled={isActive}
                />
              </ScaleDecorator>
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Celebration Components */}
      {showCelebration && (
        <Celebration
          message={showCelebration}
          onComplete={() => setShowCelebration("")}
        />
      )}
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0c0c0c' 
  },
  header: { 
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  welcomeText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  addTaskSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  // Gradient Button Styles
  gradientButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  addTaskButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFC107',
  },
  gradientButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  progressSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionSubtitle: {
    color: '#999',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
  },
  progressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  hubContainer: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  hubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hubIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  hubTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  hubDescription: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  hubButton: {
    backgroundColor: '#4C1D95',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  hubButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  focusModeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  focusModeCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  pomodoroCard: {
    borderColor: '#F97316',
  },
  deepWorkCard: {
    borderColor: '#8B5CF6',
  },
  sprintCard: {
    borderColor: '#10B981',
  },
  focusModeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  focusModeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  focusModeSubtitle: {
    color: '#999',
    fontSize: 12,
  },
  challengePreview: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
  },
  challengeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  challengeSubtext: {
    color: '#999',
    fontSize: 12,
  },
});
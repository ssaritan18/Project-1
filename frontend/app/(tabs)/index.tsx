import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal, Alert, ScrollView } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
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
import { MoodTracker } from "../../src/components/MoodTracker";
import { useChallenges } from "../../src/hooks/useChallenges";
import { useFocusSession } from "../../src/hooks/useFocusSession";
import { usePoints } from "../../src/hooks/usePoints";
import { useAchievements } from "../../src/hooks/useAchievements";
import { useStreak } from "../../src/hooks/useStreak";
import { router } from "expo-router";

const COLOR_PRESETS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];

export default function HomeScreen() {
  console.log("🏠 HomeScreen rendering...");

  const { tasks, createTask, deleteTask, setCompleted, increment } = useTasks();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [newTask, setNewTask] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEnhancedCelebration, setShowEnhancedCelebration] = useState(false);

  // Hooks for dashboard features
  const { challenges, completeChallenge } = useChallenges();
  const { currentSession, isSessionActive, startSession, endSession } = useFocusSession();
  const { totalPoints, todayPoints } = usePoints();
  const { achievements, recentAchievements } = useAchievements();
  const { currentStreak, bestStreak } = useStreak();

  // Task statistics
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.completed).length;
    const inProgress = tasks.filter(t => !t.completed && t.progress > 0).length;
    const notStarted = tasks.filter(t => t.progress === 0).length;
    
    return {
      total: tasks.length,
      completed,
      inProgress,
      notStarted,
      completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
    };
  }, [tasks]);

  const addTask = async () => {
    const title = newTask.trim();
    if (!title) return;

    try {
      await createTask({
        title,
        category: "General",
        priority: "medium",
        color: COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]
      });
      setNewTask("");
      setShowModal(false);
    } catch (error) {
      console.error("Failed to create task:", error);
      Alert.alert("Error", "Failed to create task");
    }
  };

  const handleTaskIncrement = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      await increment(taskId);
      
      // Check if task was just completed
      const updatedTask = tasks.find(t => t.id === taskId);
      if (updatedTask && updatedTask.completed && !task.completed) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
    } catch (error) {
      console.error("Failed to increment task:", error);
    }
  };

  const renderTaskItem = ({ item, drag }: any) => (
    <ScaleDecorator>
      <TaskCard
        task={item}
        onIncrement={() => handleTaskIncrement(item.id)}
        onDelete={() => deleteTask(item.id)}
        onLongPress={drag}
      />
    </ScaleDecorator>
  );

  // Dashboard feature cards
  const dashboardFeatures = [
    {
      id: 'focus',
      title: '🎯 Focus Mode',
      description: 'Start a focused work session',
      gradient: ['#8B5CF6', '#A855F7'],
      onPress: () => router.push('/focus-timer')
    },
    {
      id: 'community',
      title: '👥 Community',
      description: 'Connect with ADHDers',
      gradient: ['#EC4899', '#F97316'],
      onPress: () => router.push('/(tabs)/community')
    },
    {
      id: 'friends',
      title: '❤️ Friends',
      description: 'Manage your connections',
      gradient: ['#10B981', '#34D399'],
      onPress: () => router.push('/(tabs)/friends')
    },
    {
      id: 'profile',
      title: '👤 Profile',
      description: 'View your progress',
      gradient: ['#F97316', '#FBBF24'],
      onPress: () => router.push('/(tabs)/profile')
    }
  ];

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f172a']}
      style={styles.container}
    >
      <View style={[styles.contentContainer, { paddingTop: insets.top + 20 }]}>
        {/* Glow Header */}
        <LinearGradient
          colors={['#8B5CF6', '#EC4899', '#F97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glowHeader}
        >
          <Text style={styles.glowHeaderTitle}>🏠 ADHD Dashboard</Text>
          <Text style={styles.glowHeaderSubtitle}>Welcome back, {user?.name || 'Champion'}!</Text>
        </LinearGradient>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Quick Stats Row */}
          <View style={styles.quickStatsSection}>
            <Text style={styles.sectionTitle}>📊 Today's Overview</Text>
            <View style={styles.statsRow}>
              <LinearGradient colors={['#8B5CF6', '#A855F7']} style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </LinearGradient>
              <LinearGradient colors={['#EC4899', '#F97316']} style={styles.statCard}>
                <Text style={styles.statNumber}>{currentStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </LinearGradient>
              <LinearGradient colors={['#F97316', '#FBBF24']} style={styles.statCard}>
                <Text style={styles.statNumber}>{totalPoints}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>🎯 Progress Tracker</Text>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.1)']}
              style={styles.progressCard}
            >
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Daily Completion</Text>
                <Text style={styles.progressPercentage}>{stats.completionRate}%</Text>
              </View>
              <ProgressBar 
                progress={stats.completionRate} 
                color="#8B5CF6"
                backgroundColor="rgba(139, 92, 246, 0.2)"
                height={12}
                style={styles.progressBar}
              />
              <Text style={styles.progressSubtitle}>
                {stats.completed} of {stats.total} tasks completed today
              </Text>
            </LinearGradient>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {dashboardFeatures.map(feature => (
                <TouchableOpacity
                  key={feature.id}
                  onPress={feature.onPress}
                  style={styles.actionCard}
                >
                  <LinearGradient
                    colors={feature.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionCardGradient}
                  >
                    <Text style={styles.actionCardTitle}>{feature.title}</Text>
                    <Text style={styles.actionCardDescription}>{feature.description}</Text>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Add New Task Section */}
          <View style={styles.addTaskSection}>
            <View style={styles.addTaskHeader}>
              <Text style={styles.sectionTitle}>➕ Add New Task</Text>
              <TouchableOpacity onPress={() => setShowModal(true)}>
                <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.addTaskBtn}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addTaskBtnText}>New Task</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
              style={styles.addTaskCard}
            >
              <Text style={styles.addTaskTitle}>🌟 Quick Add</Text>
              <View style={styles.addTaskRow}>
                <TextInput
                  style={styles.taskInput}
                  placeholder="What needs to be done?"
                  placeholderTextColor="#B9B9B9"
                  value={newTask}
                  onChangeText={setNewTask}
                  maxLength={100}
                />
                <TouchableOpacity onPress={addTask} disabled={!newTask.trim()}>
                  <LinearGradient 
                    colors={newTask.trim() ? ['#8B5CF6', '#A855F7'] : ['#666', '#555']} 
                    style={styles.quickAddBtn}
                  >
                    <Ionicons name="add-circle" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* Tasks List */}
          <View style={styles.tasksSection}>
            <Text style={styles.sectionTitle}>📝 Your Tasks ({tasks.length})</Text>
            
            {tasks.length === 0 ? (
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
                style={styles.emptyTasksCard}
              >
                <Text style={styles.emptyTasksIcon}>📋✨</Text>
                <Text style={styles.emptyTasksTitle}>No tasks yet!</Text>
                <Text style={styles.emptyTasksDescription}>
                  Add your first task to start building productive habits.
                </Text>
              </LinearGradient>
            ) : (
              <DraggableFlatList
                data={tasks}
                keyExtractor={(item) => item.id}
                renderItem={renderTaskItem}
                onDragEnd={({ data }) => {
                  // Handle reordering if needed
                }}
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>

        {/* Add Task Modal */}
        <Modal visible={showModal} transparent animationType="slide">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.modalContainer}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']}
              style={styles.modalOverlay}
            >
              <LinearGradient
                colors={['#1a1a2e', '#16213e']}
                style={styles.modalContent}
              >
                <Text style={styles.modalTitle}>✨ Create New Task</Text>
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter task title..."
                  placeholderTextColor="#B9B9B9"
                  value={newTask}
                  onChangeText={setNewTask}
                  autoFocus
                  maxLength={100}
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <LinearGradient colors={['#666', '#555']} style={styles.modalBtn}>
                      <Text style={styles.modalBtnText}>Cancel</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={addTask} disabled={!newTask.trim()}>
                    <LinearGradient 
                      colors={newTask.trim() ? ['#8B5CF6', '#EC4899'] : ['#666', '#555']} 
                      style={styles.modalBtn}
                    >
                      <Text style={styles.modalBtnText}>Create Task</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </LinearGradient>
          </KeyboardAvoidingView>
        </Modal>

        {/* Celebrations */}
        {showCelebration && <Celebration />}
        {showEnhancedCelebration && <EnhancedCelebration />}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  glowHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  glowHeaderTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  glowHeaderSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  quickStatsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  progressSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  progressCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  progressPercentage: {
    color: '#8B5CF6',
    fontSize: 20,
    fontWeight: '900',
  },
  progressBar: {
    marginBottom: 12,
  },
  progressSubtitle: {
    color: '#E5E7EB',
    fontSize: 14,
  },
  actionsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionCardGradient: {
    padding: 16,
    minHeight: 80,
    justifyContent: 'space-between',
  },
  actionCardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  actionCardDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 8,
  },
  addTaskSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  addTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  addTaskBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  addTaskCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  addTaskTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  addTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    fontSize: 16,
  },
  quickAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasksSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  emptyTasksCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  emptyTasksIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTasksTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyTasksDescription: {
    color: '#E5E7EB',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
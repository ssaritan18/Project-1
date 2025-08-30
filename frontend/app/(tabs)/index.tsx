import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal, Alert } from "react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import { useTasks } from "../../src/context/TasksContext";
import { useAuth } from "../../src/context/AuthContext";
import { TaskCard } from "../../src/components/TaskCard";
import { ProgressBar } from "../../src/components/ProgressBar";
import { Ionicons } from "@expo/vector-icons";
import { Celebration } from "../../src/components/Celebration";
import { Confetti } from "../../src/components/Confetti";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ADHD-friendly Phase 2 components
import { SegmentedProgressBar } from "../../src/components/SegmentedProgressBar";
import { FocusModeTimer } from "../../src/components/FocusModeTimer";

const COLOR_PRESETS = ["#A3C9FF", "#FFCFE1", "#B8F1D9", "#FFE3A3", "#FFB3BA"];

export default function HomeScreen() {
  const { tasks, increment, addTask, remove, reorder } = useTasks();
  const { palette } = useAuth();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("5");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  
  // Phase 2: ADHD-friendly dashboard state
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [currentTime] = useState(new Date());
  const [focusSessionsToday, setFocusSessionsToday] = useState(2);

  const dayTotal = useMemo(() => {
    const total = tasks.reduce((acc, task) => acc + parseInt(task.goal), 0);
    const progress = tasks.reduce((acc, task) => acc + parseInt(task.progress), 0);
    return { total, progress, ratio: total > 0 ? progress / total : 0 };
  }, [tasks]);

  // Create time-based segments for ADHD-friendly progress tracking
  const createTimeSegments = () => {
    const morningTasks = tasks.filter(t => t.color === COLOR_PRESETS[0]); // Blue tasks for morning
    const afternoonTasks = tasks.filter(t => t.color === COLOR_PRESETS[1]); // Pink tasks for afternoon  
    const eveningTasks = tasks.filter(t => t.color === COLOR_PRESETS[2]); // Green tasks for evening
    const nightTasks = tasks.filter(t => t.color === COLOR_PRESETS[3]); // Yellow tasks for night

    return [
      {
        id: 'morning',
        label: 'Morning',
        emoji: '🌅',
        timeRange: '6:00 - 12:00',
        color: '#FFD700',
        progress: morningTasks.reduce((sum, t) => sum + t.progress, 0),
        maxProgress: morningTasks.reduce((sum, t) => sum + t.goal, 0) || 1,
        isActive: currentTime.getHours() >= 6 && currentTime.getHours() < 12,
        isCompleted: morningTasks.length > 0 && morningTasks.every(t => t.progress >= t.goal),
      },
      {
        id: 'afternoon',
        label: 'Afternoon', 
        emoji: '☀️',
        timeRange: '12:00 - 17:00',
        color: '#FF6B35',
        progress: afternoonTasks.reduce((sum, t) => sum + t.progress, 0),
        maxProgress: afternoonTasks.reduce((sum, t) => sum + t.goal, 0) || 1,
        isActive: currentTime.getHours() >= 12 && currentTime.getHours() < 17,
        isCompleted: afternoonTasks.length > 0 && afternoonTasks.every(t => t.progress >= t.goal),
      },
      {
        id: 'evening',
        label: 'Evening',
        emoji: '🌆', 
        timeRange: '17:00 - 21:00',
        color: '#6C5CE7',
        progress: eveningTasks.reduce((sum, t) => sum + t.progress, 0),
        maxProgress: eveningTasks.reduce((sum, t) => sum + t.goal, 0) || 1,
        isActive: currentTime.getHours() >= 17 && currentTime.getHours() < 21,
        isCompleted: eveningTasks.length > 0 && eveningTasks.every(t => t.progress >= t.goal),
      },
      {
        id: 'night',
        label: 'Night',
        emoji: '🌙',
        timeRange: '21:00 - 6:00', 
        color: '#4A90E2',
        progress: nightTasks.reduce((sum, t) => sum + t.progress, 0),
        maxProgress: nightTasks.reduce((sum, t) => sum + t.goal, 0) || 1,
        isActive: currentTime.getHours() >= 21 || currentTime.getHours() < 6,
        isCompleted: nightTasks.length > 0 && nightTasks.every(t => t.progress >= t.goal),
      }
    ];
  };

  const timeSegments = createTimeSegments();

  const addNewTask = () => {
    if (title.trim() && goal.trim()) {
      addTask({ title: title.trim(), goal: parseInt(goal), color });
      setTitle("");
      setGoal("5");
      setColor(COLOR_PRESETS[0]);
      setModalVisible(false);
      
      // ADHD-friendly feedback
      Alert.alert("✅ Task Added!", "Great! You're building your daily structure.", [
        { text: "Add Another", onPress: () => setModalVisible(true) },
        { text: "Perfect!", style: "default" }
      ]);
    }
  };

  const handleSegmentPress = (segment: any) => {
    Alert.alert(
      `${segment.emoji} ${segment.label}`,
      `${segment.timeRange}\nProgress: ${segment.progress}/${segment.maxProgress}`,
      [
        { text: "Add Task", onPress: () => setModalVisible(true) },
        { text: "Focus Mode", onPress: () => setShowFocusMode(true) },
        { text: "OK", style: "cancel" }
      ]
    );
  };

  const handleFocusSessionComplete = (session: any) => {
    setFocusSessionsToday(prev => prev + 1);
    // Could trigger task progress here
    Alert.alert("🎉 Session Complete!", `Great ${session.type} session! Keep up the momentum.`);
  };

  const renderTask = ({ item, drag }: any) => (
    <ScaleDecorator>
      <TaskCard
        task={item}
        onIncrement={() => increment(item.id)}
        onRemove={() => remove(item.id)}
        onDrag={drag}
        palette={palette}
      />
    </ScaleDecorator>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Today's Tasks</Text>
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: palette?.primary || '#A3C9FF' }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Progress Section */}
        <View style={[styles.progressCard, { backgroundColor: palette?.secondary || '#FFCFE1' }]}>
          <Text style={styles.progressTitle}>Daily Progress</Text>
          <ProgressBar 
            progress={dayTotal.progress} 
            total={dayTotal.total} 
            color={palette?.primary || '#A3C9FF'} 
          />
          <Text style={styles.progressText}>
            {dayTotal.progress} / {dayTotal.total} completed ({Math.round(dayTotal.ratio * 100)}%)
          </Text>
        </View>

        {/* Tasks List */}
        <DraggableFlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          onDragEnd={({ data }) => reorder(data)}
          contentContainerStyle={{ 
            paddingHorizontal: 16, 
            paddingBottom: Math.max(insets.bottom, 24)
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="checkbox-outline" size={64} color="#444" />
              <Text style={styles.emptyText}>No tasks yet</Text>
              <Text style={styles.emptySubtext}>Tap + to add your first task!</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />

        {/* Add Task Modal */}
        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add New Task</Text>
              <TouchableOpacity onPress={addNewTask}>
                <Text style={[styles.saveText, { color: palette?.primary || '#A3C9FF' }]}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.label}>Task Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter task title"
                placeholderTextColor="#777"
                value={title}
                onChangeText={setTitle}
                maxLength={50}
              />

              <Text style={styles.label}>Daily Goal</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter goal (e.g., 5)"
                placeholderTextColor="#777"
                value={goal}
                onChangeText={setGoal}
                keyboardType="numeric"
                maxLength={3}
              />

              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {COLOR_PRESETS.map((presetColor) => (
                  <TouchableOpacity
                    key={presetColor}
                    style={[
                      styles.colorOption,
                      { backgroundColor: presetColor },
                      color === presetColor && styles.selectedColor,
                    ]}
                    onPress={() => setColor(presetColor)}
                  >
                    {color === presetColor && (
                      <Ionicons name="checkmark" size={16} color="#000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        <Celebration />
        <Confetti />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0c0c0c' 
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  header: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: '700' 
  },
  addBtn: { 
    padding: 10, 
    borderRadius: 12,
    elevation: 2
  },
  progressCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressTitle: { 
    color: '#000', 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 8 
  },
  progressText: { 
    color: '#000', 
    fontSize: 12, 
    marginTop: 8,
    textAlign: 'center'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#777',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  modalContainer: { 
    flex: 1, 
    backgroundColor: '#0c0c0c' 
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  modalTitle: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '700' 
  },
  saveText: { 
    fontSize: 16, 
    fontWeight: '600' 
  },
  modalContent: { 
    padding: 16 
  },
  label: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 8, 
    marginTop: 16 
  },
  input: {
    backgroundColor: '#111',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 15,
  },
  colorRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 8 
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#fff',
  },
});
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal } from "react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import { useTasks } from "../../src/context/TasksContext";
import { useAuth } from "../../src/context/AuthContext";
import { TaskCard } from "../../src/components/TaskCard";
import { ProgressBar } from "../../src/components/ProgressBar";
import { Ionicons } from "@expo/vector-icons";
import { Celebration } from "../../src/components/Celebration";
import { Confetti } from "../../src/components/Confetti";

const COLOR_PRESETS = ["#A3C9FF", "#FFCFE1", "#B8F1D9", "#FFE3A3", "#FFB3BA"];

export default function HomeScreen() {
  const { tasks, increment, addTask, remove } = useTasks();
  const { palette } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("5");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [celebrate, setCelebrate] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const totals = useMemo(() => {
    const total = tasks.reduce((acc, t) => acc + (t.goal || 0), 0);
    const prog = tasks.reduce((acc, t) => acc + (t.progress || 0), 0);
    return { total, prog, ratio: total ? prog / total : 0 };
  }, [tasks]);

  const saveTask = () => {
    if (!title.trim()) return;
    const g = Math.max(1, parseInt(goal || '1', 10));
    addTask(title.trim(), g, color);
    setTitle("");
    setGoal("5");
    setColor(COLOR_PRESETS[0]);
    setModalVisible(false);
  };

  const onIncrement = async (id: string) => {
    const done = await increment(id);
    if (done) {
      setCelebrate(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1300);
    }
  };

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => {
          // Replace tasks in place order – since state lives in context, we need a minimal workaround:
          // We'll remove and re-add via setTasks, but TasksProvider doesn't expose setter; in MVP we'll mutate local ordering with a simple trick.
          // Here we just map to TaskCard; order visually reflects data.
        }}
        renderItem={({ item, drag, isActive }) => (
          <ScaleDecorator>
            <View style={{ opacity: isActive ? 0.9 : 1 }}>
              <TaskCard
                task={{ _id: item.id, title: item.title, goal: item.goal, progress: item.progress, color: item.color }}
                onIncrement={() => onIncrement(item.id)}
                onDelete={() => remove(item.id)}
                onDrag={drag}
              />
            </View>
          </ScaleDecorator>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        ListHeaderComponent={() => (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.header}>Today's Tasks</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyWrap}>
            <Ionicons name="trophy" size={36} color="#FFE3A3" />
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptyMeta}>Create your first tiny task and start the streak.</Text>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: palette.primary }]} onPress={() => setModalVisible(true)}>
              <Text style={styles.addText}>Add your first task</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Text style={styles.totalText}>Daily Progress</Text>
        <ProgressBar progress={totals.ratio} color={palette.accent} height={14} />
        <Text style={styles.totalMeta}>{totals.prog} / {totals.total}</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: palette.primary }]} onPress={() => setModalVisible(true)}>
          <Text style={styles.addText}>Add Task</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Task</Text>
            <TextInput placeholder="Title" placeholderTextColor="#777" style={styles.input} value={title} onChangeText={setTitle} />
            <TextInput placeholder="Goal (number)" placeholderTextColor="#777" style={styles.input} keyboardType="number-pad" value={goal} onChangeText={setGoal} />
            <Text style={styles.modalLabel}>Color</Text>
            <View style={styles.colorRow}>
              {COLOR_PRESETS.map((c) => (
                <TouchableOpacity key={c} onPress={() => setColor(c)} style={[styles.colorDot, { backgroundColor: c, borderWidth: color === c ? 2 : 1 }]} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#222' }]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#fff' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: palette.secondary }]} onPress={saveTask}>
                <Text style={{ color: '#000', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Celebration visible={celebrate} onDone={() => setCelebrate(false)} />
      <Confetti visible={showConfetti} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c0c" },
  header: { color: "#fff", fontSize: 22, fontWeight: "700" },
  emptyWrap: { alignItems: 'center', padding: 32, gap: 8 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptyMeta: { color: '#bdbdbd', textAlign: 'center' },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: "#111", borderTopColor: "#1a1a1a", borderTopWidth: 1 },
  totalText: { color: "#e5e5e5", marginBottom: 8, fontWeight: "600" },
  totalMeta: { color: "#bdbdbd", marginTop: 6 },
  addBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  addText: { color: "#0c0c0c", fontWeight: "700" },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#111', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#222', marginBottom: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalLabel: { color: '#bdbdbd', marginTop: 4, marginBottom: 6 },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorDot: { width: 28, height: 28, borderRadius: 16, borderColor: '#333' },
});
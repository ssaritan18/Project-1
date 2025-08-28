import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useTasksStore } from "../../src/store/tasks";
import { useAuthStore } from "../../src/store/auth";
import { TaskCard } from "../../src/components/TaskCard";
import { ProgressBar } from "../../src/components/ProgressBar";

export default function HomeScreen() {
  const { tasks, fetchToday, increment, createTask, removeTask } = useTasksStore();
  const { palette } = useAuthStore();

  React.useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const totals = useMemo(() => {
    const total = tasks.reduce((acc, t) => acc + (t.goal || 0), 0);
    const prog = tasks.reduce((acc, t) => acc + (t.progress || 0), 0);
    return { total, prog, ratio: total ? prog / total : 0 };
  }, [tasks]);

  return (
    <View style={styles.container}>
      <FlashList
        data={tasks}
        keyExtractor={(item) => item._id}
        estimatedItemSize={100}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onIncrement={() => increment(item._id)}
            onDelete={() => removeTask(item._id)}
          />
        )}
        ListHeaderComponent={() => (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.header}>Today's Tasks</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <Text style={styles.empty}>No tasks yet. Add one below.</Text>
        )}
      />

      <View style={styles.footer}>
        <Text style={styles.totalText}>Daily Progress</Text>
        <ProgressBar progress={totals.ratio} color={palette.accent} height={14} />
        <Text style={styles.totalMeta}>{totals.prog} / {totals.total}</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: palette.primary }]} onPress={() => createTaskPrompt(createTask)}>
          <Text style={styles.addText}>Add Task</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createTaskPrompt(createTask: (t: { title: string; goal: number; color?: string }) => void) {
  // Simple prompt replacement for MVP; replace with a proper form later
  const title = "New Task";
  const goal = 5;
  createTask({ title, goal });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c0c" },
  header: { color: "#fff", fontSize: 22, fontWeight: "700" },
  empty: { color: "#a1a1a1", textAlign: "center", marginTop: 24 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: "#111", borderTopColor: "#1a1a1a", borderTopWidth: 1 },
  totalText: { color: "#e5e5e5", marginBottom: 8, fontWeight: "600" },
  totalMeta: { color: "#bdbdbd", marginTop: 6 },
  addBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  addText: { color: "#0c0c0c", fontWeight: "700" },
});
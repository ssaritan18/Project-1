import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ProgressBar } from "./ProgressBar";
import { Ionicons } from "@expo/vector-icons";

export function TaskCard({ task, onIncrement, onDelete, onDrag }: { task: any; onIncrement: () => void; onDelete: () => void; onDrag?: () => void }) {
  const ratio = task.goal ? task.progress / task.goal : 0;
  const completed = ratio >= 1;
  return (
    <View style={styles.card}>
      <TouchableOpacity onLongPress={onDrag} delayLongPress={200} style={styles.dragHandle}>
        <Ionicons name="reorder-three" color="#888" size={22} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          {completed ? <Ionicons name="trophy" size={18} color="#FFE3A3" style={{ marginRight: 6 }} /> : null}
          <Text style={styles.title}>{task.title}</Text>
        </View>
        <ProgressBar progress={ratio} color={task.color || "#7C9EFF"} />
        <Text style={styles.meta}>{task.progress} / {task.goal}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconBtn} onPress={onIncrement}>
          <Ionicons name="add" color="#B8F1D9" size={22} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onDelete}>
          <Ionicons name="trash" color="#FFB3BA" size={22} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#111", borderRadius: 16, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center" },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
  meta: { color: "#bdbdbd", marginTop: 6, fontSize: 12 },
  actions: { marginLeft: 8, gap: 8, flexDirection: 'row' },
  iconBtn: { padding: 8 },
  dragHandle: { paddingHorizontal: 6, marginRight: 6 },
});
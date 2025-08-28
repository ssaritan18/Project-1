import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ProgressBar } from "./ProgressBar";
import { Ionicons } from "@expo/vector-icons";

export function TaskCard({ task, onIncrement, onDelete }: { task: any; onIncrement: () => void; onDelete: () => void }) {
  const ratio = task.goal ? task.progress / task.goal : 0;
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          {ratio >= 1 ? <Ionicons name="trophy" size={18} color="#FFE3A3" style={{ marginRight: 6 }} /> : null}
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
  title: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 8 },
  meta: { color: "#bdbdbd", marginTop: 6, fontSize: 12 },
  actions: { marginLeft: 12, gap: 8 },
  iconBtn: { padding: 8 },
});
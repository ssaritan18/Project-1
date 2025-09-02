import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { ProgressBar } from "./ProgressBar";
import { Ionicons } from "@expo/vector-icons";

export function TaskCard({ task, onIncrement, onDelete, onDrag }: { task: any; onIncrement: () => void; onDelete: () => void; onDrag?: () => void }) {
  const ratio = task.goal ? task.progress / task.goal : 0;
  const completed = ratio >= 1;
  
  return (
    <LinearGradient
      colors={completed ? ['rgba(16, 185, 129, 0.1)', 'rgba(52, 211, 153, 0.1)'] : ['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.1)']}
      style={styles.card}
    >
      <TouchableOpacity onLongPress={onDrag} delayLongPress={200} style={styles.dragHandle}>
        <Ionicons name="reorder-three" color="rgba(255,255,255,0.6)" size={22} />
      </TouchableOpacity>
      
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          {completed ? (
            <View style={styles.completedBadge}>
              <Ionicons name="trophy" size={16} color="#FFB347" />
            </View>
          ) : null}
          <Text style={styles.title}>{task.title}</Text>
        </View>
        
        {/* Modern Progress Bar */}
        <View style={styles.progressContainer}>
          <ProgressBar 
            progress={ratio} 
            color={completed ? "#10B981" : "#8B5CF6"}
            backgroundColor={completed ? "rgba(16, 185, 129, 0.2)" : "rgba(139, 92, 246, 0.2)"}
            height={8}
            style={styles.progressBar}
          />
        </View>
        
        <Text style={styles.meta}>
          {task.progress} / {task.goal} • {Math.round(ratio * 100)}% complete
        </Text>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity onPress={onIncrement}>
          <LinearGradient 
            colors={['#8B5CF6', '#A855F7']} 
            style={styles.actionBtn}
          >
            <Ionicons name="add" color="#fff" size={18} />
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onDelete}>
          <LinearGradient 
            colors={['#EF4444', '#F87171']} 
            style={styles.actionBtn}
          >
            <Ionicons name="trash" color="#fff" size={18} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
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
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
  console.log("🏠 HomeScreen rendering...");
  
  const { tasks, increment, addTask, remove, reorder } = useTasks();
  const { palette } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Simple test render first
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.header}>🎯 ADHD Social Club</Text>
      <Text style={styles.testText}>App is working! Phase 1 & 2 components loading...</Text>
      
      <TouchableOpacity 
        style={styles.testButton} 
        onPress={() => {
          console.log("🔘 Test Button pressed!");
          Alert.alert("✅ Success!", "Test button is working perfectly! 🎉\n\nPhase 1 & Phase 2 ADHD-friendly components are ready!");
        }}
      >
        <Text style={styles.testButtonText}>Test Button</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0c0c0c' 
  },
  header: { color: "#fff", fontSize: 28, fontWeight: "900", textAlign: "center", marginVertical: 20 },
  testText: { color: "#fff", fontSize: 16, textAlign: "center", marginVertical: 10, paddingHorizontal: 20 },
  testButton: { 
    backgroundColor: "#A3C9FF", 
    padding: 16, 
    borderRadius: 12, 
    margin: 20, 
    alignItems: "center" 
  },
  testButtonText: { color: "#000", fontSize: 16, fontWeight: "600" },
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
  testText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  testButton: {
    backgroundColor: '#A3C9FF',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
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
  // New ADHD-friendly styles
  headerContent: {
    flex: 1,
  },
  headerSubtitle: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  focusBtn: {
    padding: 10,
    borderRadius: 12,
    elevation: 2,
  },
  focusBtnText: {
    fontSize: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  motivationContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  motivationText: {
    color: '#333',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
  tasksSection: {
    flex: 1,
  },
  tasksSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tasksSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tasksSectionSubtitle: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
});
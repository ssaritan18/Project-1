import React, { createContext, useContext, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const KEY_COMPLETED_DATES = "adhers_completed_dates";

export type Task = {
  id: string;
  title: string;
  goal: number; // target units
  progress: number; // current units
  color?: string;
};

type TasksContextType = {
  tasks: Task[];
  addTask: (title: string, goal: number, color?: string) => void;
  increment: (id: string) => Promise<boolean>; // returns true if this action completed the task
  remove: (id: string) => void;
  resetToday: () => void;
};

const TasksContext = createContext<TasksContextType | undefined>(undefined);

function uid() { return Math.random().toString(36).slice(2); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

async function markTodayCompleted() {
  try {
    const key = KEY_COMPLETED_DATES;
    const raw = await AsyncStorage.getItem(key);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    const t = todayStr();
    if (!arr.includes(t)) {
      arr.push(t);
      await AsyncStorage.setItem(key, JSON.stringify(arr));
    }
  } catch {}
}

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([
    // seed minimal demo
    { id: uid(), title: "Hydrate (glasses)", goal: 6, progress: 2, color: "#A3C9FF" },
    { id: uid(), title: "Stretch (sets)", goal: 3, progress: 1, color: "#FFCFE1" },
    { id: uid(), title: "Gratitude (notes)", goal: 1, progress: 0, color: "#B8F1D9" },
  ]);

  const value = useMemo<TasksContextType>(() => ({
    tasks,
    addTask: (title, goal, color) => setTasks((prev) => [...prev, { id: uid(), title, goal, progress: 0, color }]),
    increment: async (id) => {
      let completedNow = false;
      setTasks((prev) => prev.map((t) => {
        if (t.id !== id) return t;
        const newProgress = Math.min(t.progress + 1, t.goal);
        const becameComplete = t.progress < t.goal && newProgress >= t.goal;
        if (becameComplete) completedNow = true;
        return { ...t, progress: newProgress };
      }));
      if (completedNow) await markTodayCompleted();
      return completedNow;
    },
    remove: (id) => setTasks((prev) => prev.filter((t) => t.id !== id)),
    resetToday: () => setTasks((prev) => prev.map((t) => ({ ...t, progress: 0 }))),
  }), [tasks]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within TasksProvider");
  return ctx;
}
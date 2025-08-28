import React, { createContext, useContext, useMemo, useState } from "react";

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
  increment: (id: string) => void;
  remove: (id: string) => void;
  resetToday: () => void;
};

const TasksContext = createContext<TasksContextType | undefined>(undefined);

function uid() { return Math.random().toString(36).slice(2); }

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
    increment: (id) => setTasks((prev) => prev.map((t) => t.id === id ? { ...t, progress: Math.min(t.progress + 1, t.goal) } : t)),
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
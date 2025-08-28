import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KEY_COMPLETED_DATES } from "../context/TasksContext";

function toISODate(d: Date) { return d.toISOString().slice(0, 10); }
function prevDate(d: Date) { const p = new Date(d); p.setDate(d.getDate() - 1); return p; }

export function computeStreak(dates: string[]): number {
  const set = new Set(dates);
  let c = 0;
  let pointer = new Date();
  while (set.has(toISODate(pointer))) {
    c += 1;
    pointer = prevDate(pointer);
  }
  return c;
}

export function useStreak() {
  const [streak, setStreak] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY_COMPLETED_DATES);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      setStreak(computeStreak(arr));
    } catch {
      setStreak(0);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { streak, refresh };
}
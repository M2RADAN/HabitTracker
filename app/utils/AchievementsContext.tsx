import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Achievement, DEFAULT_ACHIEVEMENTS } from "../../types/achievements";
import { Habit } from "../../types";
import { evaluateAndNotify } from "../../utils/achievementsHelper";

const ACHIEVEMENTS_KEY = "my-achievements";

type AchievementsContextType = {
  achievements: Achievement[];
  refresh: () => Promise<void>;
  evaluateAndUpdate: (
    habits: Habit[],
  ) => Promise<{ updated: Achievement[]; newlyUnlocked: Achievement[] } | null>;
};

const AchievementsContext = createContext<AchievementsContextType | undefined>(
  undefined,
);

// Merge helper (keeps new default definitions while preserving unlocked state)
function mergeDefaultsWithStored(
  defaults: Achievement[],
  stored: Achievement[],
) {
  const map = new Map(stored.map((s) => [s.id, s]));
  return defaults.map((d) => {
    const s = map.get(d.id);
    if (s) return { ...d, unlocked: s.unlocked, unlockedAt: s.unlockedAt };
    return d;
  });
}

export const AchievementsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [achievements, setAchievements] =
    useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);

  const refresh = async () => {
    try {
      const raw = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
      if (!raw) {
        setAchievements(DEFAULT_ACHIEVEMENTS);
        return;
      }
      const stored: Achievement[] = JSON.parse(raw);
      const merged = mergeDefaultsWithStored(DEFAULT_ACHIEVEMENTS, stored);
      setAchievements(merged);
    } catch (e) {
      console.warn("AchievementsContext.refresh error", e);
      setAchievements(DEFAULT_ACHIEVEMENTS);
    }
  };

  // Call evaluateAndNotify and update context state with result
  const evaluateAndUpdate = async (habits: Habit[]) => {
    try {
      const res = await evaluateAndNotify(habits);
      if (res && res.updated) {
        setAchievements(res.updated);
      }
      return res;
    } catch (e) {
      console.warn("AchievementsContext.evaluateAndUpdate error", e);
      return null;
    }
  };

  useEffect(() => {
    // load once on mount
    refresh();
  }, []);

  return (
    <AchievementsContext.Provider
      value={{ achievements, refresh, evaluateAndUpdate }}
    >
      {children}
    </AchievementsContext.Provider>
  );
};

export function useAchievements() {
  const ctx = useContext(AchievementsContext);
  if (!ctx)
    throw new Error("useAchievements must be used within AchievementsProvider");
  return ctx;
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Achievement, DEFAULT_ACHIEVEMENTS } from "../types/achievements";
import { Habit } from "../types";
import { DeviceEventEmitter } from "react-native";

const ACHIEVEMENTS_KEY = "my-achievements";

// Merge default achievement definitions with stored unlocked state
function mergeAchievements(
  defaults: Achievement[],
  stored: Achievement[],
): Achievement[] {
  const map = new Map(stored.map((s) => [s.id, s]));
  return defaults.map((d) => {
    const s = map.get(d.id);
    if (s) return { ...d, unlocked: s.unlocked, unlockedAt: s.unlockedAt };
    return d;
  });
}

// Evaluate achievements against current habits and return updated list + list of newly unlocked
function evaluate(
  habits: Habit[],
  current: Achievement[],
): { updated: Achievement[]; newlyUnlocked: Achievement[] } {
  const updated = current.map((ach) => {
    if (ach.unlocked) return ach;

    const { criteria } = ach;

    let unlocked = false;

    if (criteria.type === "totalChecks") {
      const total = habits.reduce(
        (sum, h) => sum + Object.values(h.progress).reduce((s, v) => s + v, 0),
        0,
      );
      unlocked = total >= criteria.value;
    }

    if (criteria.type === "currentStreak") {
      if (criteria.habitId) {
        const h = habits.find((x) => x.id === criteria.habitId);
        if (h) unlocked = h.streak >= criteria.value;
      } else {
        unlocked = habits.some((x) => x.streak >= criteria.value);
      }
    }

    if (criteria.type === "completedDays") {
      if (criteria.habitId) {
        const h = habits.find((x) => x.id === criteria.habitId);
        if (h)
          unlocked =
            Object.values(h.progress).filter((v) => v > 0).length >=
            criteria.value;
      } else {
        unlocked = habits.some(
          (x) =>
            Object.values(x.progress).filter((v) => v > 0).length >=
            criteria.value,
        );
      }
    }

    if (criteria.type === "percentComplete") {
      unlocked = habits.some((h) => {
        const days = Object.keys(h.progress).length || 1;
        const completed = Object.values(h.progress).filter((v) => v > 0).length;
        const percent = Math.round((completed / days) * 100);
        return percent >= criteria.value;
      });
    }

    if (unlocked) {
      return { ...ach, unlocked: true, unlockedAt: new Date().toISOString() };
    }
    return ach;
  });

  const newlyUnlocked = updated.filter(
    (u, i) => u.unlocked && !current[i].unlocked,
  );
  return { updated, newlyUnlocked };
}

async function ensureNotificationPermissions() {
  const settings = await Notifications.getPermissionsAsync();
  if (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  )
    return true;
  const request = await Notifications.requestPermissionsAsync();
  return (
    request.granted ||
    request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function evaluateAndNotify(habits: Habit[]) {
  try {
    // Load stored achievements
    const storedRaw = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    const stored: Achievement[] = storedRaw ? JSON.parse(storedRaw) : [];

    // Merge with defaults so new definitions appear
    const merged = mergeAchievements(DEFAULT_ACHIEVEMENTS, stored);

    // Evaluate
    const { updated, newlyUnlocked } = evaluate(habits, merged);

    // Persist updated achievements
    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated));

    // Emit in-app update so UI (achievements tab) can refresh immediately
    try {
      DeviceEventEmitter.emit("achievementsUpdated", updated);
    } catch (e) {
      // Best-effort; continue even if emitter fails
      console.log("achievementsHelper.emit error:", e);
    }

    if (newlyUnlocked.length === 0) return { updated, newlyUnlocked: [] };

    // Ask for permissions and send notifications for each newly unlocked achievement
    const ok = await ensureNotificationPermissions();
    if (!ok) return { updated, newlyUnlocked: [] };

    for (const a of newlyUnlocked) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Ачивка: ${a.title}`,
          body: a.description,
          data: { achievementId: a.id },
        },
        trigger: null,
      });
    }

    return { updated, newlyUnlocked };
  } catch (e) {
    console.warn("evaluateAndNotify error:", e);
    return { updated: DEFAULT_ACHIEVEMENTS, newlyUnlocked: [] };
  }
}

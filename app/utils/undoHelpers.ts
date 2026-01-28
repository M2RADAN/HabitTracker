import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_GOAL_KEY = "last_goal_event_ids";

export async function saveGoalEventIds(
  key: string,
  ids: string[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(ids));
  } catch (e) {
    console.warn("saveGoalEventIds failed", e);
  }
}

export async function loadGoalEventIds(key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch (e) {
    console.warn("loadGoalEventIds failed", e);
    return [];
  }
}

export async function clearGoalEventIds(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn("clearGoalEventIds failed", e);
  }
}

export default { saveGoalEventIds, loadGoalEventIds, clearGoalEventIds };

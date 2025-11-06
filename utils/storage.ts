import AsyncStorage from "@react-native-async-storage/async-storage";
import { Habit } from "@/types";

const HABITS_KEY = "my-habits-data"; // Ключ, по которому данные будут храниться

// Функция для получения всех привычек
export const getHabits = async (): Promise<Habit[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(HABITS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Error reading habits from storage", e);
    return [];
  }
};

// Функция для сохранения всех привычек
export const saveHabits = async (habits: Habit[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(habits);
    await AsyncStorage.setItem(HABITS_KEY, jsonValue);
  } catch (e) {
    console.error("Error saving habits to storage", e);
  }
};

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";

// Исправленные импорты
import { getHabits, saveHabits } from "../utils/storage";
import { Habit } from "../types";

const CreateHabitScreen = () => {
  const [title, setTitle] = useState("");
  const router = useRouter();

  const handleSave = async () => {
    if (title.trim().length === 0) {
      Alert.alert("Ошибка", "Название привычки не может быть пустым!");
      return;
    }

    const newHabit: Habit = {
      id: Date.now().toString(),
      title: title.trim(),
      actionType: "do",
      frequency: { type: "daily", repeats: 1 },
      measurement: { type: "checkbox", target: 1 },
      progress: {},
      streak: 0,
      color: "#FF9800",
    };

    try {
      const existingHabits = await getHabits();
      await saveHabits([...existingHabits, newHabit]);

      if (router.canGoBack()) {
        router.back();
      }
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось сохранить привычку");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Название привычки</Text>
      <TextInput
        style={styles.input}
        placeholder="Например, читать 15 минут в день"
        placeholderTextColor="#666"
        value={title}
        onChangeText={setTitle}
      />
      <View style={styles.buttonContainer}>
        <Button
          title="Сохранить привычку"
          onPress={handleSave}
          color={Platform.OS === "ios" ? "#FFFFFF" : "#4CAF50"}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
  },
  label: {
    color: "white",
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#1E1E1E",
    color: "white",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
  },
});

export default CreateHabitScreen;

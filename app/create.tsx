import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  ScrollView, // Добавили ScrollView на случай, если форма не влезет в экран
} from "react-native";
import { useRouter } from "expo-router";
import { getHabits, saveHabits } from "../utils/storage";
import { Habit } from "../types";

const CreateHabitScreen = () => {
  const router = useRouter();

  // Состояния для всех полей формы
  const [title, setTitle] = useState("");
  const [actionType, setActionType] = useState<"do" | "dont_do">("do");
  const [measurementType, setMeasurementType] = useState<
    "checkbox" | "counter"
  >("checkbox");
  const [target, setTarget] = useState("1"); // Цель для счётчика, храним как строку

  const handleSave = async () => {
    if (title.trim().length === 0) {
      Alert.alert("Ошибка", "Название привычки не может быть пустым!");
      return;
    }

    const targetValue = parseInt(target, 10);
    if (
      measurementType === "counter" &&
      (isNaN(targetValue) || targetValue <= 0)
    ) {
      Alert.alert(
        "Ошибка",
        "Цель для счётчика должна быть положительным числом!",
      );
      return;
    }

    // Создаем новую привычку, используя данные из состояния формы
    const newHabit: Habit = {
      id: Date.now().toString(),
      title: title.trim(),
      actionType: actionType,
      frequency: { type: "daily", repeats: 1 }, // Частоту пока оставляем по умолчанию
      measurement: {
        type: measurementType,
        target: measurementType === "counter" ? targetValue : 1,
      },
      progress: {},
      streak: 0,
      color: actionType === "do" ? "#4CAF50" : "#F44336", // Зеленый для 'do', красный для 'dont_do'
      lastCompletedDate: null,
    };

    try {
      const existingHabits = await getHabits();
      await saveHabits([...existingHabits, newHabit]);
      if (router.canGoBack()) router.back();
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось сохранить привычку");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
    >
      {/* Название привычки */}
      <Text style={styles.label}>Название привычки</Text>
      <TextInput
        style={styles.input}
        placeholder="Например, читать 15 минут в день"
        placeholderTextColor="#666"
        value={title}
        onChangeText={setTitle}
      />

      {/* Выбор типа: Делать / Не делать */}
      <Text style={styles.label}>Тип привычки</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            actionType === "do" && styles.toggleButtonActive,
          ]}
          onPress={() => setActionType("do")}
        >
          <Text
            style={[
              styles.toggleText,
              actionType === "do" && styles.toggleTextActive,
            ]}
          >
            Делать
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            actionType === "dont_do" && styles.toggleButtonActive,
          ]}
          onPress={() => setActionType("dont_do")}
        >
          <Text
            style={[
              styles.toggleText,
              actionType === "dont_do" && styles.toggleTextActive,
            ]}
          >
            Не делать
          </Text>
        </TouchableOpacity>
      </View>

      {/* Выбор отслеживания: Галочка / Счётчик */}
      <Text style={styles.label}>Как отслеживать?</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            measurementType === "checkbox" && styles.toggleButtonActive,
          ]}
          onPress={() => setMeasurementType("checkbox")}
        >
          <Text
            style={[
              styles.toggleText,
              measurementType === "checkbox" && styles.toggleTextActive,
            ]}
          >
            Галочка
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            measurementType === "counter" && styles.toggleButtonActive,
          ]}
          onPress={() => setMeasurementType("counter")}
        >
          <Text
            style={[
              styles.toggleText,
              measurementType === "counter" && styles.toggleTextActive,
            ]}
          >
            Счётчик
          </Text>
        </TouchableOpacity>
      </View>

      {/* Поле для цели, если выбран "Счётчик" */}
      {measurementType === "counter" && (
        <>
          <Text style={styles.label}>Сколько раз в день?</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={target}
            onChangeText={setTarget}
          />
        </>
      )}

      {/* Кнопка сохранения */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>СОХРАНИТЬ ПРИВЫЧКУ</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  label: {
    color: "white",
    fontSize: 16,
    marginBottom: 10,
    marginTop: 20,
  },
  input: {
    backgroundColor: "#1E1E1E",
    color: "white",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    overflow: "hidden",
  },
  toggleButton: {
    flex: 1,
    padding: 15,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#333333",
  },
  toggleText: {
    color: "#A0A0A0",
    fontSize: 16,
  },
  toggleTextActive: {
    color: "white",
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    padding: 18,
    alignItems: "center",
    marginTop: 40,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CreateHabitScreen;

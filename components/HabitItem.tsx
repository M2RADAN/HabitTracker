import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import dayjs from "dayjs";
import { Habit } from "../types";

type HabitItemProps = {
  habit: Habit;
  onUpdate: () => void;
};

const HabitItem = ({ habit, onUpdate }: HabitItemProps) => {
  const isCounter = habit.measurement.type === "counter";
  const today = dayjs().format("YYYY-MM-DD");

  const progress = habit.progress[today] || 0;
  const isCompleted = progress >= habit.measurement.target;

  return (
    <View style={[styles.container, { borderLeftColor: habit.color }]}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{habit.title}</Text>

        {/* НАШ НОВЫЙ БЛОК ДЛЯ ОТОБРАЖЕНИЯ СТРИКА  */}
        {habit.streak > 0 && (
          <View style={styles.streakContainer}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakText}>{habit.streak}</Text>
          </View>
        )}
      </View>

      {/* Отображаем прогресс только для счётчиков */}
      {isCounter && (
        <Text style={styles.progressText}>
          {progress} / {habit.measurement.target}
        </Text>
      )}

      <TouchableOpacity
        onPress={onUpdate}
        style={[styles.checkButton, isCompleted && styles.completedButton]}
      >
        <Text style={styles.checkText}>{isCompleted ? "✅" : "💪"}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1E1E1E",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderLeftWidth: 5,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  streakIcon: {
    fontSize: 14,
  },
  streakText: {
    color: "#FFA726", // Оранжевый цвет для счётчика
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 4,
  },
  progressText: {
    color: "#A0A0A0",
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 16,
  },
  checkButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#333333",
    justifyContent: "center",
    alignItems: "center",
  },
  completedButton: {
    backgroundColor: "#4CAF50",
  },
  checkText: {
    fontSize: 24,
  },
});

export default HabitItem;

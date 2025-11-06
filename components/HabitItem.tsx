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
        {isCounter && (
          <Text style={styles.progressText}>
            {progress} / {habit.measurement.target}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={onUpdate}
        style={[styles.checkButton, isCompleted && styles.completedButton]}
      >
        <Text style={styles.checkText}>{isCompleted ? "🔥" : "💪"}</Text>
      </TouchableOpacity>
    </View>
  );
};

// 👇 ВОТ ПРАВИЛЬНЫЕ СТИЛИ БЕЗ ОШИБОК
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1E1E1E",
    padding: 16,
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
  progressText: {
    color: "#A0A0A0",
    fontSize: 14,
    marginTop: 4,
  },
  checkButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#333333",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  completedButton: {
    backgroundColor: "#4CAF50",
  },
  checkText: {
    fontSize: 24,
  },
});

export default HabitItem;

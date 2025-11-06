import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useFocusEffect, Link } from "expo-router";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import HabitItem from "../../components/HabitItem";
import { Habit } from "../../types";
import { getHabits, saveHabits } from "../../utils/storage";

dayjs.locale("ru");

export default function DashboardScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const today = dayjs().format("YYYY-MM-DD");

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        setIsLoading(true);
        const storedHabits = await getHabits();
        setHabits(storedHabits);
        setIsLoading(false);
      };
      loadData();
      return () => {};
    }, [])
  );

  const handleUpdateHabit = async (habitId: string) => {
    let updatedHabits: Habit[] = [];
    setHabits((prevHabits) => {
      updatedHabits = prevHabits.map((habit) => {
        if (habit.id === habitId) {
          const currentProgress = habit.progress[today] || 0;
          let newProgress = currentProgress;
          if (habit.measurement.type === "checkbox") {
            newProgress = currentProgress >= 1 ? 0 : 1;
          } else {
            if (currentProgress < habit.measurement.target) {
              newProgress = currentProgress + 1;
            }
          }
          return {
            ...habit,
            progress: { ...habit.progress, [today]: newProgress },
          };
        }
        return habit;
      });
      return updatedHabits;
    });
    await saveHabits(updatedHabits);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Мои привычки</Text>
        <Text style={styles.subtitle}>Сегодня, {dayjs().format("D MMMM")}</Text>
      </View>
      {habits.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Пока нет привычек. Нажми "+", чтобы добавить первую!
          </Text>
        </View>
      ) : (
        <FlatList
          data={habits}
          renderItem={({ item }) => (
            <HabitItem
              habit={item}
              onUpdate={() => handleUpdateHabit(item.id)}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

// 👇 ВОТ ЭТА ЧАСТЬ ОТСУТСТВОВАЛА
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
  },
  subtitle: {
    fontSize: 18,
    color: "#A0A0A0",
    marginTop: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    color: "#A0A0A0",
    fontSize: 16,
    textAlign: "center",
  },
});

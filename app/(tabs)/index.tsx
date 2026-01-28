import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import dayjs from "dayjs";
import "dayjs/locale/ru";

import HabitItem from "../../components/HabitItem";
import { Habit } from "../../types";
import { getHabits, saveHabits } from "../../utils/storage";
import { requestAndShowTestNotification } from "../utils/notifications";
import { useAchievements } from "../utils/AchievementsContext";
import { useEditMode } from "../utils/EditModeContext";

dayjs.locale("ru");

export default function DashboardScreen() {
  const router = useRouter();
  const { editMode, toggleEditMode } = useEditMode();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Array<{ id: string; text: string }>>([]);
  const { evaluateAndUpdate } = useAchievements();

  const showToast = (text: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
    setToasts((t) => [...t, { id, text }]);
    // auto-remove after 3.5s
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  };

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
    }, []),
  );

  const handleUpdateHabit = async (habitId: string) => {
    const today = dayjs().format("YYYY-MM-DD");
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    let updatedHabits: Habit[] = [];

    setHabits((prevHabits) => {
      updatedHabits = prevHabits.map((habit) => {
        if (habit.id === habitId) {
          const currentProgress = habit.progress[today] || 0;
          let newProgress = currentProgress;

          // Стандартная логика обновления прогресса
          if (habit.measurement.type === "checkbox") {
            newProgress = currentProgress >= 1 ? 0 : 1;
          } else {
            if (currentProgress < habit.measurement.target) {
              newProgress = currentProgress + 1;
            }
          }

          const wasCompleted = currentProgress >= habit.measurement.target;
          const isNowCompleted = newProgress >= habit.measurement.target;

          let newStreak = habit.streak;
          let newLastCompletedDate = habit.lastCompletedDate;

          // 🔥 НАША НОВАЯ ЛОГИКА СТРИКОВ 🔥
          // Сработает только в тот момент, когда привычка становится ВЫПОЛНЕННОЙ
          if (!wasCompleted && isNowCompleted) {
            if (habit.lastCompletedDate === yesterday) {
              // Если последний раз выполняли вчера - стрик растёт!
              newStreak += 1;
            } else if (habit.lastCompletedDate !== today) {
              // Если был пропуск (или это первый раз) - начинаем стрик заново.
              newStreak = 1;
            }
            newLastCompletedDate = today;
          }
          // Если пользователь "отменяет" выполнение, стрик пока не трогаем.
          // Это упрощает логику и предотвращает случайный сброс.
          // При повторном выполнении в тот же день логика выше вернет все как было.

          return {
            ...habit,
            progress: { ...habit.progress, [today]: newProgress },
            streak: newStreak, // Обновляем стрик
            lastCompletedDate: newLastCompletedDate, // и дату последнего выполнения
          };
        }
        return habit;
      });
      return updatedHabits;
    });

    await saveHabits(updatedHabits);

    // Evaluate achievements asynchronously (don't block UI flow)
    (async () => {
      try {
        const res = await evaluateAndUpdate(updatedHabits);
        const newlyUnlocked = res?.newlyUnlocked ?? [];
        if (newlyUnlocked && newlyUnlocked.length > 0) {
          newlyUnlocked.forEach((a) => showToast(`Ачивка: ${a.title}`));
        }
      } catch (e) {
        console.log("evaluateAndNotify failed:", e);
      }
    })();
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
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={styles.title}>Мои привычки</Text>
            <Text style={styles.subtitle}>
              Сегодня, {dayjs().format("D MMMM")}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Edit mode toggle */}
            <TouchableOpacity
              onPress={() => toggleEditMode()}
              style={{ padding: 8, marginLeft: 8 }}
            >
              <Text style={{ color: editMode ? "#FFD54F" : "#A0A0A0" }}>
                {editMode ? "Готово" : "Редактировать"}
              </Text>
            </TouchableOpacity>

            {/* Test notification button */}
            <TouchableOpacity
              onPress={async () => {
                try {
                  await requestAndShowTestNotification();
                } catch (e) {
                  Alert.alert("Ошибка", "Не удалось показать уведомление");
                }
              }}
              style={{ padding: 8, marginLeft: 8 }}
            >
              <Text style={{ color: "#A0A0A0" }}>Тест уведомления</Text>
            </TouchableOpacity>

            {/* Create button */}
            <TouchableOpacity
              onPress={() => router.push("/create")}
              style={{ padding: 8, marginLeft: 8 }}
            >
              <Text style={{ color: "#A0A0A0", fontSize: 20 }}>＋</Text>
            </TouchableOpacity>
          </View>
        </View>
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

      {/* Toasters for newly unlocked achievements */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 40,
          alignItems: "center",
        }}
      >
        {toasts.map((t, i) => (
          <Toast key={t.id} text={t.text} index={i} />
        ))}
      </View>
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

// Simple animated toast component
function Toast({ text, index }: { text: string; index: number }) {
  const translateY = React.useRef(new Animated.Value(-20 - index * 60)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
        marginBottom: 8,
        width: "90%",
      }}
    >
      <View
        style={{
          backgroundColor: "#222",
          padding: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#333",
        }}
      >
        <Text style={{ color: "#FFF", fontWeight: "700" }}>{text}</Text>
      </View>
    </Animated.View>
  );
}

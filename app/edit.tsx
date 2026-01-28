import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getHabits, saveHabits } from "../utils/storage";
import { Habit } from "../types";
import {
  registerForPushNotificationsAsync,
  scheduleDailyReminderAtTime,
  cancelScheduledNotificationById,
} from "./utils/notifications";
import {
  addHabitToCalendar,
  requestCalendarPermissions,
} from "./utils/calendar";

export default function EditHabitScreen() {
  const params = useLocalSearchParams();
  const id = params?.id;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [habit, setHabit] = useState<Habit | null>(null);

  // form states
  const [title, setTitle] = useState("");

  const COLOR_OPTIONS = [
    "#4CAF50",
    "#F44336",
    "#FFD54F",
    "#2196F3",
    "#9C27B0",
    "#FF9800",
    "#795548",
  ];

  const [color, setColor] = useState("#4CAF50");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [notificationId, setNotificationId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const habits = await getHabits();
        const h = habits.find((x) => x.id === String(id));
        if (!h) {
          Alert.alert("Ошибка", "Привычка не найдена");
          if (router.canGoBack()) router.back();
          return;
        }
        setHabit(h);
        setTitle(h.title);
        setColor(h.color || "#4CAF50");
        if (h.reminder && h.reminder.enabled) {
          setReminderEnabled(true);
          setReminderTime(h.reminder.time || "09:00");
          setNotificationId(h.reminder.notificationId ?? null);
        }
      } catch (e) {
        console.log(e);
        Alert.alert("Ошибка", "Не удалось загрузить привычку");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (!habit) return;
    if (title.trim().length === 0) {
      Alert.alert("Ошибка", "Название привычки не может быть пустым");
      return;
    }

    try {
      const all = await getHabits();
      const idx = all.findIndex((x) => x.id === habit.id);
      if (idx === -1) {
        Alert.alert("Ошибка", "Привычка не найдена (во время сохранения)");
        return;
      }

      // Update fields
      all[idx] = {
        ...all[idx],
        title: title.trim(),
        color: color,
      } as Habit;

      // Handle reminders: if disabled but had notificationId -> cancel it
      if (!reminderEnabled && notificationId) {
        try {
          await cancelScheduledNotificationById(notificationId);
        } catch (e) {
          console.log("Failed to cancel notification:", e);
        }
        (all[idx] as any).reminder = {
          enabled: false,
          notificationId: null,
        } as any;
        setNotificationId(null);
      }

      // If enabled and no notificationId yet (or time changed) -> schedule
      if (reminderEnabled) {
        // If existing notificationId and time changed, cancel then reschedule
        const existingId = all[idx].reminder?.notificationId ?? null;
        const existingTime = all[idx].reminder?.time ?? null;

        if (existingId && existingTime && existingTime !== reminderTime) {
          try {
            await cancelScheduledNotificationById(existingId);
          } catch (e) {
            console.log("Failed to cancel existing notification:", e);
          }
        }

        // If no existing notificationId after possible cancel -> schedule
        const afterLoad = await getHabits();
        const afterIdx = afterLoad.findIndex((x) => x.id === habit.id);
        const afterExistingId =
          afterIdx !== -1
            ? (afterLoad[afterIdx].reminder?.notificationId ?? null)
            : null;

        if (!afterExistingId) {
          try {
            const { granted } = await registerForPushNotificationsAsync();
            if (granted) {
              const idScheduled = await scheduleDailyReminderAtTime({
                title: `Напоминание: ${title}`,
                body: `Пора выполнить привычку: ${title}`,
                time: reminderTime,
              });
              if (idScheduled) {
                (all[idx] as any).reminder = {
                  enabled: true,
                  time: reminderTime,
                  repeats: "daily",
                  notificationId: idScheduled,
                } as any;
                setNotificationId(idScheduled);
              }
            } else {
              Alert.alert(
                "Уведомления",
                "Разрешение на уведомления не получено",
              );
            }
          } catch (e) {
            console.log("Error scheduling reminder:", e);
          }
        } else {
          // just update time in stored reminder
          (all[idx] as any).reminder = {
            enabled: true,
            time: reminderTime,
            repeats: "daily",
            notificationId: afterExistingId,
          } as any;
          setNotificationId(afterExistingId);
        }
      }

      await saveHabits(all);
      Alert.alert("Сохранено", "Привычка обновлена");
      if (router.canGoBack()) router.back();
    } catch (e) {
      console.log(e);
      Alert.alert("Ошибка", "Не удалось сохранить изменения");
    }
  };

  const handleCancelReminder = async () => {
    if (!notificationId || !habit) return;
    try {
      await cancelScheduledNotificationById(notificationId);
      // update storage
      const all = await getHabits();
      const idx = all.findIndex((x) => x.id === habit.id);
      if (idx !== -1) {
        (all[idx] as any).reminder = {
          enabled: false,
          notificationId: null,
        } as any;
        await saveHabits(all);
      }
      setNotificationId(null);
      setReminderEnabled(false);
      Alert.alert("Напоминание", "Напоминание отменено");
    } catch (e) {
      console.log(e);
      Alert.alert("Ошибка", "Не удалось отменить напоминание");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={styles.label}>Редактировать привычку</Text>

      <Text style={styles.label}>Название</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Цвет</Text>
      <View style={{ flexDirection: "row", marginTop: 8, marginBottom: 8 }}>
        {COLOR_OPTIONS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.colorSwatch,
              {
                backgroundColor: c,
                borderWidth: color === c ? 2 : 0,
                borderColor: "#FFF",
                marginRight: 10,
              },
            ]}
          />
        ))}
      </View>

      <Text style={styles.label}>Напоминание</Text>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
      >
        <TouchableOpacity
          style={[
            styles.toggleButton,
            reminderEnabled && styles.toggleButtonActive,
          ]}
          onPress={() => setReminderEnabled((v) => !v)}
        >
          <Text
            style={[
              styles.toggleText,
              reminderEnabled && styles.toggleTextActive,
            ]}
          >
            {reminderEnabled ? "Включено" : "Выключено"}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { marginLeft: 12, flex: 1 }]}
          value={reminderTime}
          onChangeText={setReminderTime}
          placeholder="09:00"
          placeholderTextColor="#666"
        />
      </View>

      {notificationId ? (
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: "#D32F2F", marginTop: 12 },
          ]}
          onPress={handleCancelReminder}
        >
          <Text style={styles.saveButtonText}>Отменить напоминание</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: "#4CAF50", marginTop: 12 },
        ]}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>СОХРАНИТЬ ИЗМЕНЕНИЯ</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  toggleButton: {
    padding: 12,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#333333",
  },
  toggleText: {
    color: "#A0A0A0",
  },
  toggleTextActive: {
    color: "white",
    fontWeight: "700",
  },
  saveButton: {
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "700",
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});

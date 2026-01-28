import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getHabits, saveHabits } from "../utils/storage";
import { Habit } from "../types";
import {
  getDefaultTemplates,
  HabitTemplate,
  Frequency,
} from "../utils/templates";

// Notifications API (request permissions + schedule daily reminders)
import {
  registerForPushNotificationsAsync,
  scheduleDailyReminderAtTime,
} from "./utils/notifications";
import {
  addHabitToCalendar,
  requestCalendarPermissions,
} from "./utils/calendar";

const CreateHabitScreen = () => {
  const router = useRouter();

  // Состояния для всех полей формы
  const [title, setTitle] = useState("");
  const [actionType, setActionType] = useState<"do" | "dont_do">("do");
  const [measurementType, setMeasurementType] = useState<
    "checkbox" | "counter"
  >("checkbox");
  const [target, setTarget] = useState("1"); // Цель для счётчика, храним как строку
  const [frequency, setFrequency] = useState<Frequency>({
    type: "daily",
    repeats: 1,
  });

  const COLOR_OPTIONS = [
    "#4CAF50",
    "#F44336",
    "#FFD54F",
    "#2196F3",
    "#9C27B0",
    "#FF9800",
    "#795548",
  ];

  const [color, setColor] = useState(
    actionType === "do" ? "#4CAF50" : "#F44336",
  );

  const templates: HabitTemplate[] = getDefaultTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  // If opened with ?template=templateId, apply that template automatically
  const params = useLocalSearchParams();
  const templateParam = (params?.template as string) ?? null;
  React.useEffect(() => {
    if (!templateParam) return;
    const found = templates.find((t) => t.templateId === templateParam);
    if (found) applyTemplate(found);
  }, [templateParam]);

  const applyTemplate = (template: HabitTemplate) => {
    setSelectedTemplateId(template.templateId);
    setTitle(template.title);
    setActionType(template.actionType);
    setMeasurementType(template.measurement.type as "checkbox" | "counter");
    setTarget(String(template.measurement.target ?? 1));
    setFrequency(template.frequency as Frequency);
    setColor(
      template.color ?? (template.actionType === "do" ? "#4CAF50" : "#F44336"),
    );
  };

  const clearTemplate = () => {
    setSelectedTemplateId(null);
    setTitle("");
    setActionType("do");
    setMeasurementType("checkbox");
    setTarget("1");
    setFrequency({ type: "daily", repeats: 1 });
    setColor("#4CAF50");
  };

  // Reminder state (daily simple implementation)
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");

  // New: option to add the habit to the system calendar automatically upon saving
  const [addToCalendarOnSave, setAddToCalendarOnSave] = useState(false);

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
      frequency: frequency as any, // структура совпадает с тем, что ожидается в типах
      measurement: {
        type: measurementType,
        target: measurementType === "counter" ? targetValue : 1,
      },
      progress: {},
      streak: 0,
      color: color || (actionType === "do" ? "#4CAF50" : "#F44336"),
      lastCompletedDate: null,
      reminder: reminderEnabled
        ? {
            enabled: true,
            time: reminderTime,
            repeats: "daily",
            notificationId: null,
          }
        : undefined,
    };

    try {
      const existingHabits = await getHabits();
      // Persist initial habit
      await saveHabits([...existingHabits, newHabit]);

      // If reminder enabled, request permissions and schedule daily reminder
      if (reminderEnabled) {
        try {
          const { granted } = await registerForPushNotificationsAsync();
          if (granted) {
            const id = await scheduleDailyReminderAtTime({
              title: `Напоминание: ${newHabit.title}`,
              body: `Пора: ${newHabit.title}`,
              time: reminderTime,
            });
            if (id) {
              // Update stored habit with notification id
              const updated = await getHabits();
              const idx = updated.findIndex((h) => h.id === newHabit.id);
              if (idx !== -1) {
                // TS: cast to any to mutate reminder field
                (updated[idx] as any).reminder = {
                  enabled: true,
                  time: reminderTime,
                  repeats: "daily",
                  notificationId: id,
                } as any;
                await saveHabits(updated);
              }
            }
          }
        } catch (err) {
          console.log("Error scheduling reminder:", err);
        }
      }

      // If user opted to add habit to calendar on save — try to create event
      if (addToCalendarOnSave) {
        try {
          let start = new Date();
          if (reminderEnabled && reminderTime) {
            const [hh, mm] = reminderTime.split(":");
            const d = new Date();
            d.setHours(parseInt(hh || "0", 10));
            d.setMinutes(parseInt(mm || "0", 10));
            d.setSeconds(0);
            start = d;
          }

          await addHabitToCalendar({
            title: newHabit.title,
            notes:
              measurementType === "counter"
                ? `Цель: ${newHabit.measurement.target}`
                : undefined,
            startDate: start,
            allDay: false,
          } as any);
        } catch (e) {
          console.log("addToCalendarOnSave failed:", e);
        }
      }

      if (router.canGoBack()) router.back();
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось сохранить привычку");
    }
  };

  const handleAddToCalendar = async () => {
    if (title.trim().length === 0) {
      Alert.alert("Ошибка", "Название привычки не может быть пустым!");
      return;
    }

    try {
      const granted = await requestCalendarPermissions();
      if (!granted) {
        Alert.alert("Календарь", "Нет разрешения на доступ к календарю");
        return;
      }

      // Подготовим дату начала: если указано напоминание — используем сегодняшнюю дату + время напоминания
      let start: string | Date = new Date();
      if (reminderEnabled && reminderTime) {
        const [hh, mm] = reminderTime.split(":");
        const d = new Date();
        d.setHours(parseInt(hh || "0", 10));
        d.setMinutes(parseInt(mm || "0", 10));
        d.setSeconds(0);
        start = d;
      }

      const payload = {
        title: title.trim(),
        notes: measurementType === "counter" ? `Цель: ${target}` : undefined,
        startDate: start,
        allDay: false,
      };

      const eventId = await addHabitToCalendar(payload as any);
      if (eventId) {
        Alert.alert("Календарь", "Событие добавлено в календарь");
      } else {
        Alert.alert("Календарь", "Не удалось добавить событие в календарь");
      }
    } catch (e) {
      console.log("Add to calendar error:", e);
      Alert.alert("Календарь", "Ошибка при добавлении события");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
    >
      {/* Секция выбора шаблона */}
      <Text style={styles.label}>Выбрать шаблон</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 10 }}
      >
        {templates.map((t) => (
          <TouchableOpacity
            key={t.templateId}
            style={[
              styles.templateCard,
              selectedTemplateId === t.templateId &&
                styles.templateCardSelected,
            ]}
            onPress={() => applyTemplate(t)}
          >
            <Text style={styles.templateTitle}>{t.title}</Text>
            {t.description ? (
              <Text style={styles.templateDescription}>{t.description}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.clearTemplateButton}
          onPress={clearTemplate}
        >
          <Text style={styles.clearTemplateText}>Очистить</Text>
        </TouchableOpacity>
      </ScrollView>

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
          onPress={() => {
            setActionType("do");
            setColor("#4CAF50");
          }}
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
          onPress={() => {
            setActionType("dont_do");
            setColor("#F44336");
          }}
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

      {/* Выбор цвета */}
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

      {/* Напоминание */}
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

      {/* Опция: добавлять в календарь при сохранении */}
      <View style={{ marginTop: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <TouchableOpacity
            style={[
              styles.toggleButton,
              addToCalendarOnSave && styles.toggleButtonActive,
            ]}
            onPress={() => setAddToCalendarOnSave((v) => !v)}
          >
            <Text
              style={[
                styles.toggleText,
                addToCalendarOnSave && styles.toggleTextActive,
              ]}
            >
              {addToCalendarOnSave
                ? "Добавлять в календарь при сохранении: Да"
                : "Добавлять в календарь при сохранении: Нет"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: "#2196F3", marginTop: 0 },
          ]}
          onPress={async () => {
            try {
              await handleAddToCalendar();
            } catch (e) {
              console.log("Add to calendar failed", e);
            }
          }}
        >
          <Text style={styles.saveButtonText}>ДОБАВИТЬ В КАЛЕНДАРЬ</Text>
        </TouchableOpacity>
      </View>

      {/* Кнопка сохранения */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: color }]}
        onPress={handleSave}
      >
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
  templateCard: {
    minWidth: 160,
    padding: 12,
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: "#1E1E1E",
  },
  templateCardSelected: {
    borderWidth: 2,
    borderColor: "#FFD54F",
  },
  templateTitle: {
    color: "white",
    fontWeight: "600",
  },
  templateDescription: {
    color: "#A0A0A0",
    marginTop: 6,
    fontSize: 12,
  },
  clearTemplateButton: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#2E2E2E",
    justifyContent: "center",
    alignItems: "center",
  },
  clearTemplateText: {
    color: "#FFF",
    fontWeight: "600",
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});

export default CreateHabitScreen;

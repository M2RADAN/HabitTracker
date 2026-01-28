import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import dayjs from "dayjs";
import { getDefaultTemplates, HabitTemplate } from "../utils/templates";
import { addHabitToCalendar } from "../utils/calendar";

// Try to load native datetime picker dynamically; fall back to text inputs if not available
let DateTimePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePicker = require("@react-native-community/datetimepicker");
} catch (e) {
  // not installed — we'll fall back
  DateTimePicker = null;
}

export default function CreateGoalScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const templateId = (params?.template as string) || null;

  const [template, setTemplate] = useState<HabitTemplate | null>(null);

  // endDate as Date object
  const [endDate, setEndDate] = useState<Date>(dayjs().add(7, "day").toDate());
  // startTime holds a Date representing today's time for chosen HH:MM
  const [startTime, setStartTime] = useState<Date>(
    dayjs().hour(9).minute(0).second(0).toDate(),
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // New: user can choose whether to add events to their device calendar (default: true)
  const [addToDeviceCalendar, setAddToDeviceCalendar] = useState<boolean>(true);

  useEffect(() => {
    const t =
      getDefaultTemplates().find((x) => x.templateId === templateId) ?? null;
    setTemplate(t);
  }, [templateId]);

  const handleCreateSeries = async () => {
    if (!template) {
      Alert.alert("Ошибка", "Шаблон не выбран");
      return;
    }

    setIsProcessing(true);
    try {
      const eventsCreated: string[] = [];

      // If user disabled device calendar integration — just return success without creating events
      if (!addToDeviceCalendar) {
        Alert.alert(
          "Готово",
          "Цель создана. (Интеграция с календарём отключена)",
        );
        setIsProcessing(false);
        if (router.canGoBack()) router.back();
        return;
      }

      // Build starting datetime by combining today's date with startTime's hours/minutes
      const startBase = dayjs(startTime);

      if (template.frequency.type === "daily") {
        let cur = dayjs()
          .hour(startBase.hour())
          .minute(startBase.minute())
          .second(0);
        const last = dayjs(endDate).endOf("day");
        // ensure cur is not after last
        while (cur.isBefore(last) || cur.isSame(last, "day")) {
          const eid = await addHabitToCalendar({
            title: template.title,
            notes: template.description,
            startDate: cur.toDate(),
            allDay: false,
          } as any);
          if (eid) eventsCreated.push(eid);
          cur = cur.add(1, "day");
        }
      } else if (template.frequency.type === "weekly") {
        const days: number[] = (template.frequency as any).days || [];
        // Normalize: input templates use 1..7 for Mon..Sun; convert to 0..6 (Sun..Sat) used by dayjs
        const normalized = days.map((d) => ((d % 7) + 7) % 7);

        let cur = dayjs().startOf("day");
        const last = dayjs(endDate).endOf("day");
        while (cur.isBefore(last) || cur.isSame(last, "day")) {
          const weekday = cur.day(); // 0..6 Sun..Sat
          if (normalized.includes(weekday)) {
            const eventStart = cur
              .hour(startBase.hour())
              .minute(startBase.minute())
              .second(0);
            const eid = await addHabitToCalendar({
              title: template.title,
              notes: template.description,
              startDate: eventStart.toDate(),
              allDay: false,
            } as any);
            if (eid) eventsCreated.push(eid);
          }
          cur = cur.add(1, "day");
        }
      }

      // Persist created event ids so user can undo later (undoHelpers handles storage)
      try {
        const { saveGoalEventIds } = require("../utils/undoHelpers");
        if (saveGoalEventIds)
          await saveGoalEventIds("last_goal_event_ids", eventsCreated);
      } catch (e) {
        // not critical
        console.log("Failed to persist created event ids for undo:", e);
      }

      Alert.alert("Готово", `Добавлено событий: ${eventsCreated.length}`);
      if (router.canGoBack()) router.back();
    } catch (e) {
      console.log("createSeries error", e);
      Alert.alert("Ошибка", "Не удалось добавить события в календарь");
    } finally {
      setIsProcessing(false);
    }
  };

  const onChangeDate = (event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selected) setEndDate(selected);
  };

  const onChangeTime = (event: any, selected?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selected) setStartTime(selected);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={styles.title}>Создать цель из шаблона</Text>
      {template ? (
        <>
          <Text style={styles.label}>Шаблон</Text>
          <Text style={styles.value}>{template.title}</Text>

          <Text style={styles.label}>Описание</Text>
          <Text style={styles.value}>{template.description ?? "—"}</Text>

          <Text style={styles.label}>Дата окончания</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.pickerText}>
              {dayjs(endDate).format("YYYY-MM-DD")}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Время события</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.pickerText}>
              {dayjs(startTime).format("HH:mm")}
            </Text>
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => setAddToDeviceCalendar((v) => !v)}
              style={{
                padding: 10,
                borderRadius: 8,
                backgroundColor: addToDeviceCalendar ? "#4CAF50" : "#2E2E2E",
              }}
            >
              <Text style={{ color: "white" }}>
                {addToDeviceCalendar
                  ? "Добавлять в системный календарь: Да"
                  : "Добавлять в системный календарь: Нет"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* If native DateTimePicker is available, render it in Modal for a better UX on Android/iOS */}
          {DateTimePicker ? (
            <>
              <Modal visible={showDatePicker} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                  <View style={styles.modalContent}>
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "calendar"}
                      onChange={onChangeDate}
                    />
                    <TouchableOpacity
                      style={styles.modalClose}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.buttonText}>Готово</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              <Modal visible={showTimePicker} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                  <View style={styles.modalContent}>
                    <DateTimePicker
                      value={startTime}
                      mode="time"
                      is24Hour
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onChangeTime}
                    />
                    <TouchableOpacity
                      style={styles.modalClose}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.buttonText}>Готово</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </>
          ) : (
            // Fallback: simple confirm buttons that cycle dates/times — keep the existing TextInput-like UX
            <View>
              {/* nothing extra; user edits not available without picker */}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { marginTop: 16 }]}
            onPress={handleCreateSeries}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>
              {isProcessing ? "Добавление..." : "Добавить цель в календарь"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ghostButton, { marginTop: 12 }]}
            onPress={() =>
              router.push(`/create?template=${template.templateId}`)
            }
          >
            <Text style={styles.buttonText}>Создать как привычку</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View>
          <Text style={styles.label}>Шаблон не найден</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Назад</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  title: { color: "white", fontSize: 22, fontWeight: "700", margin: 20 },
  label: { color: "#A0A0A0", marginHorizontal: 20, marginTop: 12 },
  value: { color: "white", marginHorizontal: 20, marginTop: 6 },
  pickerButton: {
    backgroundColor: "#1E1E1E",
    marginHorizontal: 20,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  pickerText: { color: "white" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: { backgroundColor: "#121212", padding: 12 },
  modalClose: { alignItems: "center", padding: 12 },
  button: {
    backgroundColor: "#2196F3",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  ghostButton: {
    backgroundColor: "#4CAF50",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "700" },
});

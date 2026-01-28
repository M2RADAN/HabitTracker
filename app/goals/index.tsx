import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { getDefaultTemplates, HabitTemplate } from "../utils/templates";
import { addHabitToCalendar } from "../utils/calendar";

export default function GoalsScreen() {
  const [templates, setTemplates] = useState<HabitTemplate[]>([]);

  useEffect(() => {
    setTemplates(getDefaultTemplates());
  }, []);

  // Create a goal and automatically add series of events to the device calendar
  const applyTemplateAsGoal = async (template: HabitTemplate) => {
    try {
      const endDate = new Date("2026-02-02T09:00:00");
      const startDate = new Date();
      startDate.setHours(9, 0, 0, 0);

      const createdIds: string[] = [];

      let cur = new Date(startDate);
      while (cur <= endDate) {
        const id = await addHabitToCalendar({
          title: template.title,
          notes: template.description,
          startDate: new Date(cur),
          allDay: false,
        } as any);
        if (id) createdIds.push(id);
        cur.setDate(cur.getDate() + 1);
      }

      Alert.alert(
        "Готово",
        `Цель создана и добавлена в системный календарь (событий: ${createdIds.length})`,
      );
    } catch (e) {
      console.log("Error adding goal to calendar", e);
      Alert.alert("Ошибка", "Не удалось добавить цель в календарь");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Цели (шаблоны)</Text>

      <FlatList
        data={templates}
        keyExtractor={(t) => t.templateId}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.cardDesc}>{item.description}</Text>
            ) : null}
            <View style={{ flexDirection: "row", marginTop: 8 }}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => applyTemplateAsGoal(item)}
              >
                <Text style={styles.buttonText}>Создать цель</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 20 },
  title: { color: "white", fontSize: 24, fontWeight: "700", marginBottom: 12 },
  card: {
    backgroundColor: "#1E1E1E",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "600" },
  cardDesc: { color: "#A0A0A0", marginTop: 6 },
  button: { backgroundColor: "#2196F3", padding: 8, borderRadius: 8 },
  buttonText: { color: "white", fontWeight: "700" },
});

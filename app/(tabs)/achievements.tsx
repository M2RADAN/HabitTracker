import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "expo-router";
import dayjs from "dayjs";
import { Achievement } from "../../types/achievements";
import { getHabits } from "../../utils/storage";
import { Habit } from "../../types";
import { useAchievements } from "../utils/AchievementsContext";

export default function AchievementsScreen() {
  const { achievements, refresh } = useAchievements();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selected, setSelected] = useState<Achievement | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // When screen focused, refresh achievements from storage and reload habits
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;

      const load = async () => {
        const h = await getHabits();
        if (!mounted) return;
        setHabits(h);

        try {
          await refresh();
        } catch (e) {
          console.warn("achievements: refresh failed", e);
        }
      };

      load();

      return () => {
        mounted = false;
      };
    }, [refresh]),
  );

  // Compute a simple progress % for display in details modal
  const computeProgressFor = (ach: Achievement) => {
    const { criteria } = ach;
    if (criteria.type === "totalChecks") {
      const total = habits.reduce(
        (sum, h) => sum + Object.values(h.progress).reduce((s, v) => s + v, 0),
        0,
      );
      return Math.min(100, Math.round((total / criteria.value) * 100));
    }
    if (criteria.type === "currentStreak") {
      const maxStreak = habits.reduce((m, h) => Math.max(m, h.streak || 0), 0);
      return Math.min(100, Math.round((maxStreak / criteria.value) * 100));
    }
    if (criteria.type === "completedDays") {
      const maxCompleted = habits.reduce(
        (m, h) =>
          Math.max(m, Object.values(h.progress).filter((v) => v > 0).length),
        0,
      );
      return Math.min(100, Math.round((maxCompleted / criteria.value) * 100));
    }
    if (criteria.type === "percentComplete") {
      const bestPercent = habits.reduce((m, h) => {
        const days = Object.keys(h.progress).length || 1;
        const completed = Object.values(h.progress).filter((v) => v > 0).length;
        const percent = Math.round((completed / days) * 100);
        return Math.max(m, percent);
      }, 0);
      return Math.min(100, Math.round((bestPercent / criteria.value) * 100));
    }
    return 0;
  };

  const renderItem = ({ item }: { item: Achievement }) => (
    <View style={[styles.card, item.unlocked && styles.cardUnlocked]}>
      <View style={styles.cardRow}>
        <Text style={[styles.title, item.unlocked && styles.titleUnlocked]}>
          {item.title}
        </Text>
        {item.unlocked && (
          <Text style={styles.unlockedAt}>
            {item.unlockedAt ? dayjs(item.unlockedAt).format("D MMM YYYY") : ""}
          </Text>
        )}
      </View>
      <Text style={styles.desc}>{item.description}</Text>
      {!item.unlocked && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            setSelected(item);
            setModalVisible(true);
          }}
        >
          <Text style={styles.buttonText}>Подробнее</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={achievements}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 20 }}
      />

      {selected && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setModalVisible(false);
            setSelected(null);
          }}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.6)",
            }}
          >
            <View
              style={{
                width: "90%",
                backgroundColor: "#1E1E1E",
                padding: 16,
                borderRadius: 12,
              }}
            >
              <Text
                style={[
                  styles.title,
                  selected.unlocked && styles.titleUnlocked,
                ]}
              >
                {selected.title}
              </Text>
              <Text style={styles.desc}>{selected.description}</Text>

              <View style={{ marginTop: 12 }}>
                <Text style={{ color: "#A0A0A0" }}>
                  Прогресс: {computeProgressFor(selected)}%
                </Text>
                <View
                  style={{
                    height: 8,
                    backgroundColor: "#333",
                    borderRadius: 4,
                    marginTop: 8,
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${computeProgressFor(selected)}%`,
                      backgroundColor: "#4CAF50",
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  { marginTop: 16, alignSelf: "flex-end" },
                ]}
                onPress={() => {
                  setModalVisible(false);
                  setSelected(null);
                }}
              >
                <Text style={styles.buttonText}>Закрыть</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  card: {
    backgroundColor: "#1E1E1E",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  cardUnlocked: { borderColor: "#4CAF50", borderWidth: 1 },
  title: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  titleUnlocked: { color: "#4CAF50" },
  desc: { color: "#A0A0A0", marginTop: 6 },
  button: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#333",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  buttonText: { color: "#FFFFFF" },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  unlockedAt: { color: "#8A8A8A", fontSize: 12 },
});

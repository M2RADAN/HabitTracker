import React, { useMemo, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "expo-router";

import { Habit } from "../../types";
import { getHabits } from "../../utils/storage";
import { transformProgressToContributions } from "../utils/dataTransformers";
// Простая встроенная реализация heatmap — без внешних зависимостей
const SimpleHeatmap = ({
  values,
  endDate = new Date(),
  numDays = 105,
}: {
  values: { date: string; count: number }[];
  endDate?: Date;
  numDays?: number;
}) => {
  const map = values.reduce(
    (acc: Record<string, number>, v) => {
      acc[v.date] = (acc[v.date] || 0) + (v.count || 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  const start = new Date(endDate);
  start.setDate(start.getDate() - numDays + 1);

  const dates: { date: string; count: number }[] = [];
  for (let d = new Date(start); d <= endDate; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    dates.push({ date: iso, count: map[iso] || 0 });
  }

  const getColor = (count: number) => {
    if (count <= 0) return "#2A2A2A";
    if (count === 1) return "#d6e685";
    if (count === 2) return "#8cc665";
    if (count === 3) return "#44a340";
    return "#1e6823";
  };

  return (
    <View style={{ width: "100%", flexDirection: "row", flexWrap: "wrap" }}>
      {dates.map((d) => (
        <View
          key={d.date}
          style={{
            width: 16,
            height: 16,
            margin: 2,
            borderRadius: 2,
            backgroundColor: getColor(d.count),
          }}
        />
      ))}
    </View>
  );
};

// Получаем ширину экрана для графика
const screenWidth = Dimensions.get("window").width;

type Contribution = { date: string; count: number };

function computeStats(contributions: Contribution[]) {
  if (!contributions || contributions.length === 0) {
    return {
      percent: 0,
      totalChecks: 0,
      currentStreak: 0,
      bestStreak: 0,
      completedDays: 0,
      totalDays: 0,
    };
  }

  // Сортируем по дате по возрастанию
  const sorted = [...contributions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const totalDays = sorted.length;
  const completedDays = sorted.filter((d) => d.count && d.count > 0).length;
  const totalChecks = sorted.reduce((sum, d) => sum + (d.count || 0), 0);
  const percent = Math.round((completedDays / totalDays) * 100);

  // Вычисляем текущую серию и лучшую серию
  let bestStreak = 0;
  let currentStreak = 0;
  let running = 0;

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].count && sorted[i].count > 0) {
      running += 1;
    } else {
      if (running > bestStreak) bestStreak = running;
      running = 0;
    }
  }
  // финальное сравнение
  if (running > bestStreak) bestStreak = running;

  // Текущая серия — смотрим с конца массива назад
  let curr = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].count && sorted[i].count > 0) curr += 1;
    else break;
  }
  currentStreak = curr;

  return {
    percent,
    totalChecks,
    currentStreak,
    bestStreak,
    completedDays,
    totalDays,
  };
}

// Новая утилита: агрегация вкладов (contributions) по всем привычкам
function aggregateContributions(habits: Habit[]): Contribution[] {
  const map: Record<string, number> = {};
  for (const h of habits) {
    const contribs = transformProgressToContributions(h);
    for (const c of contribs) {
      map[c.date] = (map[c.date] || 0) + (c.count || 0);
    }
  }
  const keys = Object.keys(map).sort();
  return keys.map((k) => ({ date: k, count: map[k] }));
}

export default function ProgressScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  // selectedId: 'all' means aggregated view
  const [selectedId, setSelectedId] = useState<string | "all">("all");
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем все привычки при каждом входе на экран
  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        setIsLoading(true);
        const storedHabits = await getHabits();
        setHabits(storedHabits);
        // Если нет привычек, selectedId stays 'all'
        if (storedHabits.length > 0 && selectedId === "all") {
          // оставляем aggregated by default
        }
        setIsLoading(false);
      };
      loadData();
    }, [selectedId]),
  );

  // Вычисляем данные для выбранного режима: все привычки или конкретная
  const contributionData: Contribution[] = useMemo(() => {
    if (selectedId === "all") {
      return aggregateContributions(habits);
    }
    const h = habits.find((x) => x.id === selectedId) || null;
    return h ? transformProgressToContributions(h) : [];
  }, [habits, selectedId]);

  const stats = useMemo(
    () => computeStats(contributionData),
    [contributionData],
  );

  const renderHabitSelector = ({ item }: { item: Habit }) => (
    <TouchableOpacity
      style={[
        styles.habitButton,
        selectedId === item.id && styles.selectedHabitButton,
      ]}
      onPress={() => setSelectedId(item.id)}
    >
      <Text style={styles.habitButtonText}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Прогресс</Text>
      </View>

      {/* Селектор: All + отдельные привычки */}
      <View>
        <Text style={styles.subtitle}>Выберите привычку для просмотра:</Text>
        <FlatList
          data={[
            { id: "all", title: "Все" } as any,
            ...habits.map((h) => ({ id: h.id, title: h.title })),
          ]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.habitButton,
                (selectedId === item.id ||
                  (selectedId === "all" && item.id === "all")) &&
                  styles.selectedHabitButton,
              ]}
              onPress={() => setSelectedId(item.id)}
            >
              <Text style={styles.habitButtonText}>{item.title}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
      </View>

      {/* Отображение графика */}
      {contributionData.length > 0 ? (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>
            {selectedId === "all"
              ? "Все привычки"
              : habits.find((h) => h.id === selectedId)?.title || "Привычка"}
          </Text>

          <SimpleHeatmap
            values={contributionData}
            endDate={new Date()}
            numDays={105}
          />

          {/* Статистика */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Выполнено</Text>
              <Text style={styles.statValue}>{stats.percent}%</Text>
              <Text
                style={styles.statHint}
              >{`${stats.completedDays}/${stats.totalDays} дней`}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Всего отметок</Text>
              <Text style={styles.statValue}>{stats.totalChecks}</Text>
              <Text style={styles.statHint}>сумма выполнений</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Текущая серия</Text>
              <Text style={styles.statValue}>{stats.currentStreak}</Text>
              <Text style={styles.statHint}>дней подряд</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Лучшая серия</Text>
              <Text style={styles.statValue}>{stats.bestStreak}</Text>
              <Text style={styles.statHint}>дней подряд</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            Создайте привычку и выполните её хотя бы один раз, чтобы увидеть
            прогресс.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

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
    fontSize: 16,
    color: "#A0A0A0",
    marginHorizontal: 20,
    marginBottom: 10,
  },
  habitButton: {
    backgroundColor: "#1E1E1E",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedHabitButton: {
    backgroundColor: "#4CAF50",
  },
  habitButtonText: {
    color: "white",
    fontSize: 14,
  },
  chartContainer: {
    marginTop: 30,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  chartTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  statsContainer: {
    marginTop: 20,
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "#1E1E1E",
    padding: 12,
    borderRadius: 10,
    width: "48%",
    marginBottom: 10,
  },
  statLabel: {
    color: "#A0A0A0",
    fontSize: 12,
  },
  statValue: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 6,
  },
  statHint: {
    color: "#8A8A8A",
    fontSize: 12,
    marginTop: 4,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  noDataText: {
    color: "#A0A0A0",
    fontSize: 16,
  },
});

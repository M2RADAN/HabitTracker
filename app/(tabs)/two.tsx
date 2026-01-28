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

export default function ProgressScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем все привычки при каждом входе на экран
  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        setIsLoading(true);
        const storedHabits = await getHabits();
        setHabits(storedHabits);
        // Автоматически выбираем первую привычку в списке, если она есть
        if (storedHabits.length > 0) {
          setSelectedHabit(storedHabits[0]);
        }
        setIsLoading(false);
      };
      loadData();
    }, []),
  );

  const contributionData: Contribution[] = selectedHabit
    ? transformProgressToContributions(selectedHabit)
    : [];

  const stats = useMemo(
    () => computeStats(contributionData),
    [contributionData],
  );

  // Настройки внешнего вида (оставляем для возможной миграции)
  const chartConfig = {
    backgroundGradientFrom: "#1E1E1E",
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: "#1E1E1E",
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Зеленый цвет
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const renderHabitSelector = ({ item }: { item: Habit }) => (
    <TouchableOpacity
      style={[
        styles.habitButton,
        selectedHabit?.id === item.id && styles.selectedHabitButton,
      ]}
      onPress={() => setSelectedHabit(item)}
    >
      <Text style={styles.habitButtonText}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Прогресс</Text>
      </View>

      {/* Список привычек для выбора */}
      <View>
        <Text style={styles.subtitle}>Выберите привычку для просмотра:</Text>
        <FlatList
          data={habits}
          renderItem={renderHabitSelector}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
      </View>

      {/* Отображение графика для выбранной привычки */}
      {selectedHabit ? (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{selectedHabit.title}</Text>

          <SimpleHeatmap
            values={contributionData}
            endDate={new Date()}
            numDays={105}
          />

          {/* Статистика по выбранной привычке */}
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
            Создайте привычку, чтобы видеть прогресс!
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

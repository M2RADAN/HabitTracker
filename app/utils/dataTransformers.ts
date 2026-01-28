import { Habit } from "../../types";

// Тип данных, который ожидает ContributionGraph
export type ContributionData = {
  date: string;
  count: number;
};

/**
 * Преобразует объект progress из нашей привычки в массив,
 * подходящий для react-native-chart-kit.
 * @param habit - Объект привычки
 * @returns Массив данных для графика
 */
export const transformProgressToContributions = (
  habit: Habit,
): ContributionData[] => {
  const progressData = habit.progress;

  // Object.keys(progressData) вернет массив всех дат ['2023-11-06', '2023-11-07', ...]
  return Object.keys(progressData).map((date) => ({
    date: date,
    count: progressData[date], // Берем значение (количество выполнений) для этой даты
  }));
};

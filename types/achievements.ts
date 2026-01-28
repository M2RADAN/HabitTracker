export type AchievementCriteria =
  | { type: "totalChecks"; value: number; habitId?: string | null }
  | { type: "currentStreak"; value: number; habitId?: string | null }
  | { type: "completedDays"; value: number; habitId?: string | null }
  | { type: "percentComplete"; value: number; habitId?: string | null };

export type Achievement = {
  id: string;
  title: string;
  description: string;
  criteria: AchievementCriteria;
  unlocked?: boolean;
  unlockedAt?: string | null;
};

// Набор дефолтных ачивок (пример)
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-day",
    title: "Первый день",
    description: "Выполните любую привычку хотя бы один раз.",
    criteria: { type: "completedDays", value: 1, habitId: null },
  },
  {
    id: "7-day-streak",
    title: "7-дневная серия",
    description: "Держите серию 7 дней подряд по одной привычке.",
    criteria: { type: "currentStreak", value: 7 },
  },
  {
    id: "100-checks",
    title: "100 отметок",
    description: "Сделайте суммарно 100 отметок по любой привычке.",
    criteria: { type: "totalChecks", value: 100, habitId: null },
  },
  {
    id: "high-accuracy",
    title: "Высокая статистика",
    description:
      "Достигните >90% выполнения за период отображения для привычки.",
    criteria: { type: "percentComplete", value: 90 },
  },
];

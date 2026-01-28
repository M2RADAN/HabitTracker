// Preinstalled habit templates used in the "Create" screen
// This file exports a small library of templates and a helper to retrieve them.

export type Frequency =
  | { type: "daily"; repeats: number }
  | { type: "weekly"; days: number[] };

export type Measurement =
  | { type: "checkbox"; target: number }
  | { type: "counter"; target: number };

export type HabitTemplate = {
  templateId: string; // stable id for the template
  title: string;
  actionType: "do" | "dont_do";
  frequency: Frequency;
  measurement: Measurement;
  color?: string;
  description?: string;
};

export const DEFAULT_TEMPLATES: HabitTemplate[] = [
  {
    templateId: "read_15",
    title: "Чтение — 15 минут",
    actionType: "do",
    frequency: { type: "daily", repeats: 1 },
    measurement: { type: "counter", target: 1 },
    color: "#4CAF50",
    description: "Читать любой материал минимум 15 минут в день",
  },
  {
    templateId: "no_sugar",
    title: "Без сахара",
    actionType: "dont_do",
    frequency: { type: "daily", repeats: 1 },
    measurement: { type: "checkbox", target: 1 },
    color: "#F44336",
    description: "Не употреблять добавленный сахар в течение дня",
  },
  {
    templateId: "workout_3x",
    title: "Тренировка — 3 раза в неделю",
    actionType: "do",
    frequency: { type: "weekly", days: [1, 3, 5] },
    measurement: { type: "checkbox", target: 1 },
    color: "#2196F3",
    description: "Короткая тренировка в выбранные дни недели",
  },
];

export const getDefaultTemplates = (): HabitTemplate[] => DEFAULT_TEMPLATES;

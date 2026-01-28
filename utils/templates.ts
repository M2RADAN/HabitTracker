// Preinstalled habit templates used in the "Create" screen
// Expanded set of templates for the library (used by Create screen)

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
  {
    templateId: "meditate_10",
    title: "Медитация — 10 минут",
    actionType: "do",
    frequency: { type: "daily", repeats: 1 },
    measurement: { type: "counter", target: 1 },
    color: "#8E24AA",
    description: "Медитировать минимум 10 минут в день",
  },
  {
    templateId: "water_8",
    title: "Вода — 8 стаканов",
    actionType: "do",
    frequency: { type: "daily", repeats: 1 },
    measurement: { type: "counter", target: 8 },
    color: "#29B6F6",
    description: "Выпить 8 стаканов воды в течение дня",
  },
  {
    templateId: "sleep_7h",
    title: "Сон — 7+ часов",
    actionType: "do",
    frequency: { type: "daily", repeats: 1 },
    measurement: { type: "checkbox", target: 1 },
    color: "#3E2723",
    description: "Лечь спать и проспать не менее 7 часов",
  },
  {
    templateId: "journaling_daily",
    title: "Дневник — записать мысли",
    actionType: "do",
    frequency: { type: "daily", repeats: 1 },
    measurement: { type: "checkbox", target: 1 },
    color: "#FF7043",
    description: "Записать краткие заметки о дне или идеях",
  },
  {
    templateId: "steps_5k",
    title: "Шаги — 5000 шагов",
    actionType: "do",
    frequency: { type: "daily", repeats: 1 },
    // For step-counting we'll store target as a number — app logic should interpret this as steps
    measurement: { type: "counter", target: 5000 },
    color: "#43A047",
    description: "Проходить не менее 5000 шагов в день",
  },
  {
    templateId: "no_alcohol_weekend",
    title: "Без алкоголя — выходные",
    actionType: "dont_do",
    frequency: { type: "weekly", days: [6, 0] }, // Saturday(6), Sunday(0)
    measurement: { type: "checkbox", target: 1 },
    color: "#6D4C41",
    description: "Не употреблять алкоголь в выходные",
  },
];

export const getDefaultTemplates = (): HabitTemplate[] => DEFAULT_TEMPLATES;

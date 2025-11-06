import { Habit } from "../types";

export const MOCK_HABITS: Habit[] = [
  {
    id: "1",
    title: "Сыграть 2 катки в КС",
    actionType: "do",
    frequency: { type: "daily", repeats: 1 },
    measurement: { type: "counter", target: 2 },
    progress: { "2023-10-28": 1 }, // Предположим, сегодня 28-е
    streak: 5,
    color: "#FF9800",
  },
  {
    id: "2",
    title: "Не дрочить на фута фурри",
    actionType: "dont_do",
    frequency: { type: "daily", repeats: 1 },
    measurement: { type: "checkbox", target: 1 },
    progress: {},
    streak: 2,
    color: "#F44336",
  },
  {
    id: "3",
    title: "Прочитать 10 текстов ОКСИ",
    actionType: "do",
    frequency: { type: "daily", repeats: 1 },
    measurement: { type: "counter", target: 10 },
    progress: { "2023-10-28": 10 },
    streak: 12,
    color: "#2196F3",
  },
];

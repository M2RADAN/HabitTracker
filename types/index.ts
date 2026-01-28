export type Habit = {
  id: string;
  title: string;
  actionType: "do" | "dont_do"; // Делать или не делать
  frequency: {
    type: "daily" | "weekly";
    repeats: number; // Сколько раз в неделю/день
  };
  measurement: {
    type: "checkbox" | "counter";
    target: number; // Цель для счётчика (для checkbox = 1)
  };
  progress: {
    [date: string]: number; // '2023-10-28': 2 (2 выполнения за день)
  };
  streak: number; // Текущий стрик
  color: string; // Цвет для отображения в UI
  lastCompletedDate: string | null; //
};

declare module "@/constants/Colors" {
  const Colors: {
    light: { [key: string]: string };
    dark: { [key: string]: string };
  };
  export default Colors;
}

declare module "@/types" {
  export type Habit = import("./index").Habit;
}

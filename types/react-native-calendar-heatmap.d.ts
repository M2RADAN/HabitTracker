declare module "react-native-calendar-heatmap" {
  import { ComponentType } from "react";
  import { ViewProps } from "react-native";

  type HeatmapValue = { date: string; count: number };

  export interface CalendarHeatmapProps extends ViewProps {
    values?: HeatmapValue[];
    endDate?: Date;
    numDays?: number;
    gutterSize?: number;
    squareSize?: number;
    showMonthLabels?: boolean;
    onPress?: (value?: HeatmapValue) => void;
    style?: any;
  }

  const CalendarHeatmap: ComponentType<CalendarHeatmapProps>;
  export default CalendarHeatmap;
}

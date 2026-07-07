import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

const TABLET_MIN_WIDTH = 768;

function gridCardWidth(
  width: number,
  columns: number,
  gridPadding: number,
  cardMargin: number
): number {
  return (width - gridPadding * 2 - cardMargin * columns * 2) / columns;
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_MIN_WIDTH;
  const isPhone = !isTablet;

  return useMemo(() => {
    const cardMargin = isTablet ? 8 : 6;
    const gridPadding = isTablet ? 20 : 16;
    const addStudentGridColumns = isTablet ? 4 : 3;
    const attendanceGridColumns = isTablet ? 4 : 3;

    return {
      width,
      height,
      isTablet,
      isPhone,
      cardMargin,
      addStudentGridColumns,
      attendanceGridColumns,
      addStudentCardWidth: gridCardWidth(width, addStudentGridColumns, gridPadding, cardMargin),
      attendanceCardWidth: gridCardWidth(width, attendanceGridColumns, gridPadding, cardMargin),
    };
  }, [width, height, isTablet, isPhone]);
}

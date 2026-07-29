import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCoachMenu } from "../contexts/CoachMenuContext";

export default function CoachMenuButton() {
  const insets = useSafeAreaInsets();
  const { hasSession, openMenu } = useCoachMenu();

  if (!hasSession) return null;

  return (
    <TouchableOpacity
      style={[styles.button, { top: insets.top + 8 }]}
      onPress={openMenu}
      accessibilityLabel="Open coach menu"
      accessibilityRole="button"
      activeOpacity={0.85}
    >
      <Ionicons name="menu" size={26} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 12,
    zIndex: 1000,
    backgroundColor: "#4d1212",
    borderRadius: 10,
    padding: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

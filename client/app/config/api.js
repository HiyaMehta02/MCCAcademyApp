import { Platform } from "react-native";
import Constants from "expo-constants";

const getBaseUrl = () => {
  if (Constants.isDevice) {
    return `http://${process.env.IP_ADDRESS}:3000`;
  }

  // Emulators
  if (Platform.OS === "android") return "http://10.0.2.2:3000";
  return "http://localhost:3000";
};

export const BASE_URL = getBaseUrl();

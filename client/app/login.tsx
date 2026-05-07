import { View, StyleSheet } from "react-native";
import GreenBox from "../components/Login-Box";

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <GreenBox style={styles.card} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#232323",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    minHeight: 360,
  },
});


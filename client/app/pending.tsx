import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { supabase } from "../lib/supabase";

export default function PendingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Access Request Pending</Text>
      <Text style={styles.subtitle}>
        Your coach access request is waiting for admin approval. You will be able to enter the app once approved.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#181818", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "white", fontSize: 28, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  subtitle: { color: "#d0d0d0", fontSize: 16, textAlign: "center", maxWidth: 560, marginBottom: 24 },
  button: { backgroundColor: "#4d1212", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
});


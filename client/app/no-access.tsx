import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { supabase } from "../lib/supabase";

export default function NoAccessScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>No coach account</Text>
      <Text style={styles.subtitle}>
        You signed in successfully, but your user is not linked to an approved coach profile. Ask
        your administrator to create a coach account for you.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181818",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  title: { color: "white", fontSize: 28, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  subtitle: { color: "#d0d0d0", fontSize: 16, textAlign: "center", maxWidth: 520, lineHeight: 24 },
  button: {
    marginTop: 24,
    backgroundColor: "#4d1212",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
});

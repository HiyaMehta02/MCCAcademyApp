import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { supabase } from "../lib/supabase";
import { MIN_PASSWORD_LENGTH, validateNewPassword } from "../lib/coachAuth";

export default function SetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const validationError = validateNewPassword(password, confirm);
    if (validationError) {
      Alert.alert("Invalid password", validationError);
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        Alert.alert("Could not update password", updateError.message);
        return;
      }

      const { error: clearError } = await supabase.rpc("clear_must_set_password");
      if (clearError) {
        Alert.alert(
          "Password saved",
          "Your password was updated, but the app could not confirm the change. Try signing in again."
        );
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      router.replace("/(tabs)");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Ionicons name="shield-checkmark-outline" size={48} color="#116C1B" style={{ marginBottom: 12 }} />
        <Text style={styles.title}>Set your password</Text>
        <Text style={styles.subtitle}>
          Your administrator created this account with a temporary password. Choose a new password
          before continuing (minimum {MIN_PASSWORD_LENGTH} characters).
        </Text>

        <Text style={styles.label}>New password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!submitting}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#666" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          editable={!submitting}
        />

        <TouchableOpacity
          style={[styles.button, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Save and continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => supabase.auth.signOut()}
          disabled={submitting}
        >
          <Text style={styles.linkText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181818",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#262626",
    borderRadius: 12,
    padding: 28,
    alignItems: "center",
  },
  title: { color: "white", fontSize: 28, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: { color: "#c8c8c8", fontSize: 15, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  label: { color: "#e0e0e0", alignSelf: "flex-start", marginBottom: 6, fontWeight: "600" },
  input: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  passwordRow: { width: "100%", position: "relative" },
  passwordInput: { paddingRight: 44 },
  eyeBtn: { position: "absolute", right: 10, top: 10, padding: 4 },
  button: {
    width: "100%",
    backgroundColor: "#116C1B",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "white", fontSize: 17, fontWeight: "700" },
  linkBtn: { marginTop: 16, padding: 8 },
  linkText: { color: "#aaa", textDecorationLine: "underline" },
});

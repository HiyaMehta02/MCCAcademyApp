import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { createCoachAccount, resetCoachPassword } from "../../lib/adminApi";
import { isValidLoginId, MIN_PASSWORD_LENGTH, normalizeLoginId } from "../../lib/coachAuth";

function randomTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 12; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export default function ManageCoachesScreen() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [loginId, setLoginId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(false);

  const [resetLoginId, setResetLoginId] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc("is_current_user_admin");
      setIsAdmin(Boolean(data));
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate() {
    const id = normalizeLoginId(loginId);
    if (!isValidLoginId(id)) {
      Alert.alert("Invalid Coach ID", "Use 3–32 characters: letters, numbers, dots, hyphens, or underscores.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Name required", "Enter first and last name.");
      return;
    }
    if (tempPassword.length < MIN_PASSWORD_LENGTH) {
      Alert.alert("Password too short", `Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await createCoachAccount({
        login_id: id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        temp_password: tempPassword,
        is_admin: makeAdmin,
      });
      Alert.alert(
        "Coach created",
        `${result.message}\n\nCoach ID: ${result.login_id}\nTemp password: ${tempPassword}\n\nShare these securely. The coach must set a new password on first login.`
      );
      setLoginId("");
      setFirstName("");
      setLastName("");
      setTempPassword("");
      setMakeAdmin(false);
    } catch (err) {
      Alert.alert("Could not create coach", err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    const id = normalizeLoginId(resetLoginId);
    if (!isValidLoginId(id)) {
      Alert.alert("Invalid Coach ID", "Enter a valid coach ID to reset.");
      return;
    }
    if (resetPassword.length < MIN_PASSWORD_LENGTH) {
      Alert.alert("Password too short", `Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setResetting(true);
    try {
      await resetCoachPassword(id, resetPassword);
      Alert.alert(
        "Password reset",
        `New temporary password for ${id}:\n${resetPassword}\n\nCoach must change it on next login.`
      );
      setResetLoginId("");
      setResetPassword("");
    } catch (err) {
      Alert.alert("Reset failed", err instanceof Error ? err.message : String(err));
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#116C1B" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Admin access required</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
        <Text style={styles.backLinkText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Manage coaches</Text>
      <Text style={styles.lead}>
        Create coach login accounts. Passwords are stored securely in Supabase Auth — only temporary
        passwords are shown here once.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create coach account</Text>

        <Text style={styles.label}>Coach ID</Text>
        <TextInput
          style={styles.input}
          value={loginId}
          onChangeText={setLoginId}
          placeholder="e.g. coach001"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>First name</Text>
        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

        <Text style={styles.label}>Last name</Text>
        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />

        <Text style={styles.label}>Temporary password</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex]}
            value={tempPassword}
            onChangeText={setTempPassword}
            secureTextEntry={!showTempPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.smallBtn} onPress={() => setShowTempPassword((v) => !v)}>
            <Text style={styles.smallBtnText}>{showTempPassword ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallBtn}
            onPress={() => setTempPassword(randomTempPassword())}
          >
            <Text style={styles.smallBtnText}>Generate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.labelInline}>Grant admin access</Text>
          <Switch value={makeAdmin} onValueChange={setMakeAdmin} trackColor={{ true: "#116C1B" }} />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
          onPress={handleCreate}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryBtnText}>Create account</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reset password</Text>
        <Text style={styles.hint}>Sets a new temporary password and requires change on next login.</Text>

        <Text style={styles.label}>Coach ID</Text>
        <TextInput
          style={styles.input}
          value={resetLoginId}
          onChangeText={setResetLoginId}
          placeholder="coach ID to reset"
          autoCapitalize="none"
        />

        <Text style={styles.label}>New temporary password</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex]}
            value={resetPassword}
            onChangeText={setResetPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.smallBtn} onPress={() => setResetPassword(randomTempPassword())}>
            <Text style={styles.smallBtnText}>Generate</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.secondaryBtn, resetting && { opacity: 0.7 }]}
          onPress={handleReset}
          disabled={resetting}
        >
          {resetting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryBtnText}>Reset password</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: "#181818", justifyContent: "center", alignItems: "center", padding: 20 },
  container: { flex: 1, backgroundColor: "#181818" },
  content: { padding: 20, paddingBottom: 40 },
  backLink: { marginBottom: 8 },
  backLinkText: { color: "#aaa", fontSize: 16 },
  title: { color: "white", fontSize: 28, fontWeight: "700", marginBottom: 8 },
  lead: { color: "#c0c0c0", marginBottom: 20, lineHeight: 22 },
  card: { backgroundColor: "#262626", borderRadius: 12, padding: 16, marginBottom: 20 },
  cardTitle: { color: "white", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  label: { color: "#ddd", marginBottom: 6, fontWeight: "600" },
  labelInline: { color: "#ddd", fontWeight: "600", flex: 1 },
  hint: { color: "#aaa", marginBottom: 12, fontSize: 14 },
  input: {
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  flex: { flex: 1, marginBottom: 0 },
  smallBtn: {
    backgroundColor: "#444",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 12,
  },
  smallBtnText: { color: "white", fontWeight: "600", fontSize: 13 },
  switchRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  primaryBtn: {
    backgroundColor: "#116C1B",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtn: {
    backgroundColor: "#4d1212",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "700", fontSize: 16 },
  backBtn: { marginTop: 12, backgroundColor: "#4d1212", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText: { color: "white", fontWeight: "600" },
});

import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

type RequestStatus = "pending" | "approved" | "rejected" | null;

export default function RequestAccessScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<RequestStatus>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadContext() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setLoading(false);
        return;
      }

      setEmail(session.user.email ?? "");
      setFullName(
        (session.user.user_metadata?.full_name as string) ??
          (session.user.user_metadata?.name as string) ??
          ""
      );

      const { data: existing } = await supabase
        .from("coach_access_requests")
        .select("status, applicant_note")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (existing?.status) setStatus(existing.status);
      if (existing?.applicant_note) setNote(existing.applicant_note);
      setLoading(false);
    }

    loadContext();
  }, []);

  async function handleSubmit() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    setSubmitting(true);
    setMessage("");

    const payload = {
      auth_user_id: session.user.id,
      email: session.user.email ?? email,
      full_name: fullName || null,
      applicant_note: note || null,
      status: "pending",
    };

    const { error } = await supabase.from("coach_access_requests").insert(payload);

    if (error) {
      if (error.code === "23505") {
        setStatus("pending");
        setMessage("Request already submitted. Please wait for admin approval.");
      } else {
        setMessage(error.message);
      }
    } else {
      setStatus("pending");
      setMessage("Request submitted. Please wait for admin approval.");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#116C1B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request Coach Access</Text>
      <Text style={styles.subtitle}>
        You are signed in, but your account is not approved yet. Submit a request for admin review.
      </Text>

      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Full name" />
      <TextInput style={[styles.input, styles.readonly]} value={email} editable={false} />
      <TextInput
        style={[styles.input, styles.note]}
        value={note}
        onChangeText={setNote}
        placeholder="Optional note for admins"
        multiline
      />

      <TouchableOpacity
        style={[styles.button, (submitting || status === "pending") && { opacity: 0.7 }]}
        disabled={submitting || status === "pending"}
        onPress={handleSubmit}
      >
        <Text style={styles.buttonText}>{status === "pending" ? "Request submitted" : "Submit request"}</Text>
      </TouchableOpacity>

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: "#181818", justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#181818", justifyContent: "center", alignItems: "center", padding: 24 },
  title: { color: "white", fontSize: 30, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  subtitle: { color: "#d0d0d0", fontSize: 15, textAlign: "center", maxWidth: 620, marginBottom: 16 },
  input: {
    width: "100%",
    maxWidth: 620,
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  readonly: { opacity: 0.85 },
  note: { minHeight: 90, textAlignVertical: "top" },
  button: { backgroundColor: "#116C1B", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginTop: 4 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
  message: { color: "#f3f3f3", marginTop: 12, textAlign: "center" },
});


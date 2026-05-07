import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";

type CoachRequest = {
  request_id: string;
  auth_user_id: string;
  email: string | null;
  full_name: string | null;
  status: "pending" | "approved" | "rejected";
  applicant_note: string | null;
  created_at: string;
};

export default function CoachRequestsScreen() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requests, setRequests] = useState<CoachRequest[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadRequests() {
    setLoading(true);
    const [{ data: adminData }, { data: reqRows }] = await Promise.all([
      supabase.rpc("is_current_user_admin"),
      supabase
        .from("coach_access_requests")
        .select("request_id, auth_user_id, email, full_name, status, applicant_note, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    setIsAdmin(Boolean(adminData));
    setRequests((reqRows as CoachRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function reviewRequest(item: CoachRequest, nextStatus: "approved" | "rejected") {
    setBusyId(item.request_id);

    const { data: reviewerCoachId } = await supabase.rpc("current_coach_id");
    const note = reviewNotes[item.request_id] ?? null;
    const nowIso = new Date().toISOString();

    const { error: requestUpdateError } = await supabase
      .from("coach_access_requests")
      .update({
        status: nextStatus,
        review_notes: note,
        reviewed_by: reviewerCoachId,
        reviewed_at: nowIso,
      })
      .eq("request_id", item.request_id);

    if (!requestUpdateError && nextStatus === "approved") {
      const nameParts = (item.full_name ?? "").trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] ?? "Coach";
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";

      await supabase.from("coaches").upsert(
        {
          auth_user_id: item.auth_user_id,
          email: item.email,
          first_name: firstName,
          last_name: lastName,
          status: "approved",
          approved_by: reviewerCoachId,
          approved_at: nowIso,
          is_admin: false,
        },
        { onConflict: "auth_user_id" }
      );
    }

    setBusyId(null);
    loadRequests();
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
    <View style={styles.container}>
      <Text style={styles.title}>Coach Access Requests</Text>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.request_id}
        ListEmptyComponent={<Text style={styles.empty}>No pending requests.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.full_name || "Unknown name"}</Text>
            <Text style={styles.meta}>{item.email || "No email"}</Text>
            <Text style={styles.meta}>Requested: {new Date(item.created_at).toLocaleString()}</Text>
            {!!item.applicant_note && <Text style={styles.note}>Note: {item.applicant_note}</Text>}
            <TextInput
              style={styles.input}
              placeholder="Review note (optional)"
              value={reviewNotes[item.request_id] ?? ""}
              onChangeText={(txt) => setReviewNotes((prev) => ({ ...prev, [item.request_id]: txt }))}
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn, busyId === item.request_id && styles.disabled]}
                disabled={busyId === item.request_id}
                onPress={() => reviewRequest(item, "approved")}
              >
                <Text style={styles.actionText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn, busyId === item.request_id && styles.disabled]}
                disabled={busyId === item.request_id}
                onPress={() => reviewRequest(item, "rejected")}
              >
                <Text style={styles.actionText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: "#181818", justifyContent: "center", alignItems: "center", padding: 20 },
  container: { flex: 1, backgroundColor: "#181818", padding: 20 },
  title: { color: "white", fontSize: 28, fontWeight: "700", marginBottom: 14 },
  empty: { color: "#d0d0d0", textAlign: "center", marginTop: 24 },
  card: { backgroundColor: "#262626", borderRadius: 12, padding: 14, marginBottom: 12 },
  name: { color: "white", fontSize: 20, fontWeight: "600" },
  meta: { color: "#d0d0d0", marginTop: 2 },
  note: { color: "#f4f4f4", marginTop: 6, marginBottom: 4 },
  input: { backgroundColor: "white", borderRadius: 8, marginTop: 8, marginBottom: 10, paddingHorizontal: 10, paddingVertical: 8 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, borderRadius: 8, alignItems: "center", paddingVertical: 10 },
  approveBtn: { backgroundColor: "#116C1B" },
  rejectBtn: { backgroundColor: "#8b2323" },
  actionText: { color: "white", fontWeight: "700" },
  disabled: { opacity: 0.6 },
  backBtn: { marginTop: 12, backgroundColor: "#4d1212", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText: { color: "white", fontWeight: "600" },
});


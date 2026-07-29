import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useBranch } from "../../contexts/BranchContext";
import { todayDateString } from "../../lib/attendance";
import { formatAttendanceDayLabel } from "../../lib/dateFormat";
import {
  BranchOption,
  CoachAttendanceRecord,
  CoachBranchSession,
  CoachListItem,
  checkoutCoachAttendance,
  fetchActiveBranches,
  fetchActiveCoaches,
  fetchCoachAttendanceForDate,
  fetchCoachBranchSessions,
  fetchCurrentCoachId,
  fetchRecentCoachAttendance,
  formatSessionTime,
  normalizeTime,
  recordCoachAttendance,
  upsertCoachBranchSession,
} from "../../lib/coachAttendanceApi";
import { supabase } from "../../lib/supabase";

export default function CoachAttendanceScreen() {
  const { branch } = useBranch();
  const [bootLoading, setBootLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myCoachId, setMyCoachId] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [coaches, setCoaches] = useState<CoachListItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<CoachBranchSession[]>([]);
  const [todayRows, setTodayRows] = useState<CoachAttendanceRecord[]>([]);
  const [recentRows, setRecentRows] = useState<CoachAttendanceRecord[]>([]);
  const [sessionStart, setSessionStart] = useState("17:00");
  const [sessionEnd, setSessionEnd] = useState("19:00");
  const [earlyMinutes, setEarlyMinutes] = useState("0");
  const [notes, setNotes] = useState("");

  const sessionDate = todayDateString();

  const selectedCoach = useMemo(
    () => coaches.find((c) => c.coach_id === selectedCoachId) ?? null,
    [coaches, selectedCoachId]
  );

  const selectedBranch = useMemo(
    () => branches.find((b) => b.branch_id === selectedBranchId) ?? null,
    [branches, selectedBranchId]
  );

  const visibleCoaches = useMemo(() => {
    if (isAdmin) return coaches;
    return coaches.filter((c) => c.coach_id === myCoachId);
  }, [coaches, isAdmin, myCoachId]);

  const loadDetails = useCallback(async () => {
    if (!selectedCoachId) {
      setSessions([]);
      setTodayRows([]);
      setRecentRows([]);
      return;
    }

    setDetailLoading(true);
    try {
      const [sessionRows, today, recent] = await Promise.all([
        selectedBranchId
          ? fetchCoachBranchSessions(selectedCoachId, selectedBranchId)
          : Promise.resolve([]),
        fetchCoachAttendanceForDate(selectedCoachId, sessionDate),
        fetchRecentCoachAttendance(selectedCoachId, 12),
      ]);

      setSessions(sessionRows);
      setTodayRows(today);
      setRecentRows(recent);

      if (sessionRows[0]) {
        setSessionStart(sessionRows[0].start_time.slice(0, 5));
        setSessionEnd(sessionRows[0].end_time.slice(0, 5));
      }
    } finally {
      setDetailLoading(false);
    }
  }, [selectedBranchId, selectedCoachId, sessionDate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setBootLoading(true);
      try {
        const [{ data: adminData }, coachId, coachRows, branchRows] = await Promise.all([
          supabase.rpc("is_current_user_admin"),
          fetchCurrentCoachId(),
          fetchActiveCoaches(),
          fetchActiveBranches(),
        ]);
        if (!mounted) return;

        const admin = Boolean(adminData);
        setIsAdmin(admin);
        setMyCoachId(coachId);
        setCoaches(coachRows);
        setBranches(branchRows);
        setSelectedCoachId(coachId ?? coachRows[0]?.coach_id ?? null);
        setSelectedBranchId(branch?.branchId ?? branchRows[0]?.branch_id ?? null);
      } catch (err) {
        if (mounted) {
          Alert.alert("Error", err instanceof Error ? err.message : "Failed to load.");
        }
      } finally {
        if (mounted) setBootLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [branch?.branchId]);

  useEffect(() => {
    if (bootLoading) return;
    loadDetails().catch((err) => {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to load attendance.");
    });
  }, [bootLoading, loadDetails]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadDetails();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSaveSessionTemplate() {
    if (!selectedCoachId || !selectedBranchId) {
      Alert.alert("Missing info", "Select a coach and branch first.");
      return;
    }
    setBusy(true);
    try {
      await upsertCoachBranchSession({
        coachId: selectedCoachId,
        branchId: selectedBranchId,
        startTime: sessionStart,
        endTime: sessionEnd,
        label: `${selectedBranch?.branch_name ?? "Branch"} session`,
      });
      Alert.alert("Saved", "Session times saved for this coach at this branch.");
      await loadDetails();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not save session.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckIn(session?: CoachBranchSession) {
    if (!selectedCoachId || !selectedBranchId) {
      Alert.alert("Missing info", "Select a coach and branch first.");
      return;
    }

    const start = session?.start_time.slice(0, 5) ?? sessionStart;
    const end = session?.end_time.slice(0, 5) ?? sessionEnd;

    setBusy(true);
    try {
      const early = Number(earlyMinutes);
      await recordCoachAttendance({
        coachId: selectedCoachId,
        branchId: selectedBranchId,
        attendanceDate: sessionDate,
        sessionStart: normalizeTime(start),
        sessionEnd: normalizeTime(end),
        status: early > 0 ? "partial" : "present",
        leftEarlyMinutes: early > 0 ? early : null,
        notes: notes.trim() || null,
        recordedBy: myCoachId,
      });
      Alert.alert(
        "Checked in",
        `${selectedCoach?.first_name ?? "Coach"} marked present at ${selectedBranch?.branch_name ?? "branch"} (${formatSessionTime(normalizeTime(start))}–${formatSessionTime(normalizeTime(end))}).`
      );
      setNotes("");
      await loadDetails();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not check in.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut(row: CoachAttendanceRecord) {
    setBusy(true);
    try {
      const early = Number(earlyMinutes);
      await checkoutCoachAttendance({
        coachAttendanceId: row.coach_attendance_id,
        leftEarlyMinutes: early > 0 ? early : null,
        notes: notes.trim() || row.notes,
      });
      Alert.alert("Checked out", "Checkout time saved.");
      await loadDetails();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not check out.");
    } finally {
      setBusy(false);
    }
  }

  if (bootLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#116C1B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Coach attendance</Text>
          <Text style={styles.subtitle}>{formatAttendanceDayLabel(sessionDate)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />}
      >
        <Text style={styles.sectionLabel}>Coach</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {visibleCoaches.map((coach) => {
            const selected = coach.coach_id === selectedCoachId;
            return (
              <TouchableOpacity
                key={coach.coach_id}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => setSelectedCoachId(coach.coach_id)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                  {coach.first_name} {coach.last_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionLabel}>Branch</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {branches.map((b) => {
            const selected = b.branch_id === selectedBranchId;
            return (
              <TouchableOpacity
                key={b.branch_id}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => setSelectedBranchId(b.branch_id)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{b.branch_name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {detailLoading ? <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} /> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session times</Text>
          <Text style={styles.help}>
            Example: Wadi Kabir 5–7pm, then Azaiba 7–9pm — check in separately at each branch.
          </Text>
          <View style={styles.row2}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Start</Text>
              <TextInput
                style={styles.input}
                value={sessionStart}
                onChangeText={setSessionStart}
                placeholder="17:00"
                placeholderTextColor="#777"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>End</Text>
              <TextInput
                style={styles.input}
                value={sessionEnd}
                onChangeText={setSessionEnd}
                placeholder="19:00"
                placeholderTextColor="#777"
              />
            </View>
          </View>
          <View style={styles.row2}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Left early (minutes)</Text>
              <TextInput
                style={styles.input}
                value={earlyMinutes}
                onChangeText={setEarlyMinutes}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#777"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional"
                placeholderTextColor="#777"
              />
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryBtn, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={handleSaveSessionTemplate}
            >
              <Text style={styles.secondaryBtnText}>Save session template</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => handleCheckIn()}
            >
              <Text style={styles.primaryBtnText}>Check in here</Text>
            </TouchableOpacity>
          </View>
        </View>

        {sessions.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Saved sessions at this branch</Text>
            {sessions.map((session) => (
              <View key={session.session_id} style={styles.sessionRow}>
                <Text style={styles.sessionText}>
                  {formatSessionTime(session.start_time)} – {formatSessionTime(session.end_time)}
                  {session.label ? ` · ${session.label}` : ""}
                </Text>
                <TouchableOpacity
                  style={styles.miniBtn}
                  disabled={busy}
                  onPress={() => handleCheckIn(session)}
                >
                  <Text style={styles.miniBtnText}>Check in</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today (all branches)</Text>
          {todayRows.length === 0 ? (
            <Text style={styles.empty}>No coach attendance yet today.</Text>
          ) : (
            todayRows.map((row) => (
              <View key={row.coach_attendance_id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>
                    {row.branches?.branch_name ?? "Branch"} · {row.status}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {formatSessionTime(row.session_start)} – {formatSessionTime(row.session_end)}
                    {row.left_early_minutes
                      ? ` · left ${row.left_early_minutes} min early`
                      : ""}
                  </Text>
                </View>
                {!row.checked_out_at ? (
                  <TouchableOpacity
                    style={styles.miniBtn}
                    disabled={busy}
                    onPress={() => handleCheckOut(row)}
                  >
                    <Text style={styles.miniBtnText}>Check out</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.checkedOut}>Out</Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent history</Text>
          {recentRows.length === 0 ? (
            <Text style={styles.empty}>No recent records.</Text>
          ) : (
            recentRows.map((row) => (
              <View key={row.coach_attendance_id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>
                    {formatAttendanceDayLabel(row.attendance_date)}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {row.branches?.branch_name ?? "Branch"} ·{" "}
                    {formatSessionTime(row.session_start)} – {formatSessionTime(row.session_end)} ·{" "}
                    {row.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1c1c1c" },
  center: { flex: 1, backgroundColor: "#1c1c1c", justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#4d1212",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: { color: "white", fontSize: 15 },
  titleBlock: { flex: 1 },
  title: { color: "white", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#aaa", fontSize: 13, marginTop: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 8 },
  sectionLabel: { color: "#bbb", fontSize: 13, fontWeight: "600", marginTop: 8 },
  chipScroll: { marginBottom: 4 },
  chip: {
    backgroundColor: "#2a2a2a",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#fff" },
  chipText: { color: "#fff", fontWeight: "600" },
  chipTextActive: { color: "#111" },
  card: {
    backgroundColor: "#2a2a2a",
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
  },
  cardTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 8 },
  help: { color: "#aaa", fontSize: 13, lineHeight: 18, marginBottom: 12 },
  row2: { flexDirection: "row", gap: 10 },
  field: { flex: 1, marginBottom: 10 },
  fieldLabel: { color: "#aaa", fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#1c1c1c",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 15,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#116C1B",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#3a3a3a",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#fff", fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#444",
  },
  sessionText: { flex: 1, color: "#fff", fontSize: 14 },
  miniBtn: {
    backgroundColor: "#116C1B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  miniBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#444",
  },
  historyTitle: { color: "#fff", fontSize: 14, fontWeight: "600" },
  historyMeta: { color: "#aaa", fontSize: 12, marginTop: 2 },
  checkedOut: { color: "#8bc34a", fontWeight: "700", fontSize: 12 },
  empty: { color: "#888", fontSize: 14 },
});

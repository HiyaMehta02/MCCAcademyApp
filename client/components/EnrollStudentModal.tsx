import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BatchOption,
  CustomDayTier,
  FEE_PROGRAM_SCHEDULES,
  FeePlanOption,
  StudentGender,
  WEEKDAY_OPTIONS,
  allowedCustomDayCounts,
  enrollStudentInBatch,
  enrollStudentInFeePlan,
  fetchBatchesForBranch,
  fetchCustomDayTiers,
  fetchFeePlansForBranch,
  upsertStudentCustomPlan,
} from "../lib/studentProfile";

type EnrollTab = "batch" | "program" | "custom";

type Props = {
  visible: boolean;
  onClose: () => void;
  studentId: string;
  branchId: string | null;
  gender: StudentGender;
  enrolledBatchIds: string[];
  enrolledFeePlanIds: string[];
  onEnrolled: () => Promise<void>;
};

function formatFee(gender: StudentGender, boys: number, girls: number | null): string {
  if (gender === "boy") return `${boys} OMR (boys)`;
  return `${girls ?? boys} OMR (girls)`;
}

export default function EnrollStudentModal({
  visible,
  onClose,
  studentId,
  branchId,
  gender,
  enrolledBatchIds,
  enrolledFeePlanIds,
  onEnrolled,
}: Props) {
  const [tab, setTab] = useState<EnrollTab>("batch");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [feePlans, setFeePlans] = useState<FeePlanOption[]>([]);
  const [tiers, setTiers] = useState<CustomDayTier[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [savingCustom, setSavingCustom] = useState(false);

  useEffect(() => {
    if (!visible || !branchId) return;
    setLoading(true);
    Promise.all([
      fetchBatchesForBranch(branchId, enrolledBatchIds),
      fetchFeePlansForBranch(branchId, enrolledFeePlanIds),
      fetchCustomDayTiers(branchId),
    ])
      .then(([b, fp, t]) => {
        setBatches(b);
        setFeePlans(fp);
        setTiers(t);
      })
      .catch((err) => Alert.alert("Error", err?.message ?? "Failed to load options."))
      .finally(() => setLoading(false));
  }, [visible, branchId, enrolledBatchIds, enrolledFeePlanIds]);

  const dayCount = selectedDays.length;
  const allowedCounts = branchId ? allowedCustomDayCounts(branchId) : [];
  const matchedTier = useMemo(
    () => tiers.find((t) => t.days_per_week === dayCount) ?? null,
    [tiers, dayCount]
  );

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleBatchEnroll(batchId: string) {
    setBusyId(batchId);
    try {
      await enrollStudentInBatch(studentId, batchId);
      await onEnrolled();
      setBatches((prev) => prev.filter((b) => b.batch_id !== batchId));
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to enroll in batch.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleProgramEnroll(feePlanId: string) {
    setBusyId(feePlanId);
    try {
      await enrollStudentInFeePlan(studentId, feePlanId);
      await onEnrolled();
      setFeePlans((prev) => prev.filter((p) => p.fee_plan_id !== feePlanId));
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to add program.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveCustomPlan() {
    if (!branchId || !matchedTier) {
      Alert.alert(
        "Invalid selection",
        `Select ${allowedCounts.join(", ")} days for this branch. You picked ${dayCount}.`
      );
      return;
    }

    const shortDays = selectedDays.map((d) => d.slice(0, 3)).join(", ");
    const planLabel = `${matchedTier.display_label} (${shortDays})`;

    setSavingCustom(true);
    try {
      await upsertStudentCustomPlan({
        studentId,
        branchId,
        selectedDays: [...selectedDays].sort(),
        daysPerWeek: dayCount,
        boysMonthlyFee: matchedTier.boys_monthly_fee,
        girlsMonthlyFee: matchedTier.girls_monthly_fee,
        planLabel,
      });
      await onEnrolled();
      setSelectedDays([]);
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to save custom plan.");
    } finally {
      setSavingCustom(false);
    }
  }

  function handleClose() {
    setSelectedDays([]);
    setTab("batch");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Add enrollment</Text>
          <Text style={styles.hint}>
            Squad batch, fee program (e.g. Special Batch), or custom days not tied to a squad.
          </Text>

          <View style={styles.tabRow}>
            {(
              [
                ["batch", "Squad batch"],
                ["program", "Fee program"],
                ["custom", "Custom days"],
              ] as const
            ).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.tab, tab === key && styles.tabActive]}
                onPress={() => setTab(key)}
              >
                <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!branchId ? (
            <Text style={styles.empty}>Student has no branch set.</Text>
          ) : loading ? (
            <ActivityIndicator color="#116C1B" style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView style={styles.list}>
              {tab === "batch" &&
                (batches.length === 0 ? (
                  <Text style={styles.empty}>No other squad batches available.</Text>
                ) : (
                  batches.map((b) => (
                    <TouchableOpacity
                      key={b.batch_id}
                      style={styles.row}
                      onPress={() => handleBatchEnroll(b.batch_id)}
                      disabled={busyId === b.batch_id}
                    >
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowTitle}>{b.batch_name}</Text>
                        <Text style={styles.rowSub}>{b.fee_plan_name ?? "Standard plan"}</Text>
                      </View>
                      {busyId === b.batch_id ? (
                        <ActivityIndicator size="small" color="#116C1B" />
                      ) : (
                        <Ionicons name="add-circle-outline" size={24} color="#116C1B" />
                      )}
                    </TouchableOpacity>
                  ))
                ))}

              {tab === "program" &&
                (feePlans.length === 0 ? (
                  <Text style={styles.empty}>All fee programs already added.</Text>
                ) : (
                  feePlans.map((p) => (
                    <TouchableOpacity
                      key={p.fee_plan_id}
                      style={styles.row}
                      onPress={() => handleProgramEnroll(p.fee_plan_id)}
                      disabled={busyId === p.fee_plan_id}
                    >
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowTitle}>{p.display_name}</Text>
                        <Text style={styles.rowSub}>
                          {FEE_PROGRAM_SCHEDULES[p.plan_code] ?? "See academy schedule"}
                        </Text>
                        <Text style={styles.feeText}>
                          {formatFee(gender, p.boys_monthly_fee, p.girls_monthly_fee)}
                        </Text>
                      </View>
                      {busyId === p.fee_plan_id ? (
                        <ActivityIndicator size="small" color="#116C1B" />
                      ) : (
                        <Ionicons name="add-circle-outline" size={24} color="#116C1B" />
                      )}
                    </TouchableOpacity>
                  ))
                ))}

              {tab === "custom" && (
                <>
                  <Text style={styles.customHint}>
                    Pick training days. Fee tier is based on how many days you select (
                    {allowedCounts.join(", ")} days for this branch).
                  </Text>
                  <View style={styles.dayGrid}>
                    {WEEKDAY_OPTIONS.map((day) => {
                      const active = selectedDays.includes(day);
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[styles.dayChip, active && styles.dayChipActive]}
                          onPress={() => toggleDay(day)}
                        >
                          <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                            {day.slice(0, 3)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {tiers.map((t) => (
                    <Text key={t.tier_id} style={styles.tierLine}>
                      · {t.display_label}: {t.boys_monthly_fee} OMR
                      {t.boys_monthly_fee !== t.girls_monthly_fee
                        ? ` (boys) / ${t.girls_monthly_fee} (girls)`
                        : ""}
                    </Text>
                  ))}
                  {dayCount > 0 && (
                    <Text style={styles.selectedSummary}>
                      {dayCount} day{dayCount !== 1 ? "s" : ""} selected
                      {matchedTier
                        ? ` → ${gender === "boy" ? matchedTier.boys_monthly_fee : matchedTier.girls_monthly_fee} OMR/month`
                        : ` → need ${allowedCounts.join(", ")} days`}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[styles.saveBtn, !matchedTier && styles.saveBtnDisabled]}
                    onPress={handleSaveCustomPlan}
                    disabled={!matchedTier || savingCustom}
                  >
                    {savingCustom ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save custom day plan</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#2a2a2a",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    maxHeight: "92%",
  },
  title: { color: "white", fontSize: 20, fontWeight: "600", marginBottom: 6 },
  hint: { color: "#aaa", fontSize: 13, marginBottom: 12 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#444",
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#116C1B" },
  tabText: { color: "#ccc", fontSize: 12, textAlign: "center" },
  tabTextActive: { color: "white", fontWeight: "600" },
  list: { maxHeight: 360 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a3a",
  },
  rowInfo: { flex: 1, paddingRight: 12 },
  rowTitle: { color: "white", fontSize: 15 },
  rowSub: { color: "#aaa", fontSize: 12, marginTop: 2 },
  feeText: { color: "#6fcf7a", fontSize: 12, marginTop: 4 },
  empty: { color: "#888", fontSize: 14, marginVertical: 16 },
  customHint: { color: "#ccc", fontSize: 13, marginBottom: 12 },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#444",
    minWidth: 52,
    alignItems: "center",
  },
  dayChipActive: { backgroundColor: "#116C1B" },
  dayChipText: { color: "#ccc", fontSize: 13 },
  dayChipTextActive: { color: "white", fontWeight: "600" },
  tierLine: { color: "#888", fontSize: 12, marginBottom: 4 },
  selectedSummary: { color: "#6fcf7a", fontSize: 14, marginVertical: 12 },
  saveBtn: {
    backgroundColor: "#116C1B",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "600" },
  closeBtn: { alignItems: "center", paddingVertical: 12 },
  closeBtnText: { color: "#aaa", fontSize: 16 },
});

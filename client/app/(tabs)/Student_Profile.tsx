import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import EnrollStudentModal from "../../components/EnrollStudentModal";
import {
  AttendanceRecord,
  BillingSummary,
  PaymentMethod,
  PaymentRecord,
  StudentEnrollment,
  StudentFeePlanEnrollment,
  StudentCustomPlan,
  StudentGender,
  StudentProfile,
  currentBillingPeriod,
  fetchStudentAttendance,
  fetchStudentEnrollments,
  fetchStudentFeePlanEnrollments,
  fetchStudentCustomPlan,
  fetchStudentPayments,
  fetchStudentProfile,
  recordPayment,
  refreshStudentBilling,
  updateStudentFlags,
  removeStudentFromBatch,
  removeStudentFromFeePlan,
  removeStudentCustomPlan,
  FEE_PROGRAM_SCHEDULES,
} from "../../lib/studentProfile";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "bank_transfer", label: "Bank transfer" },
];

const HISTORY_PREVIEW_LIMIT = 5;

function formatOmr(amount: number): string {
  return `${Number(amount).toFixed(2)} OMR`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}

export default function StudentProfileScreen() {
  const params = useLocalSearchParams();
  const studentId = Array.isArray(params.student_id) ? params.student_id[0] : params.student_id;
  const batchName = Array.isArray(params.batch_name) ? params.batch_name[0] : params.batch_name;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [feePlanEnrollments, setFeePlanEnrollments] = useState<StudentFeePlanEnrollment[]>([]);
  const [customPlan, setCustomPlan] = useState<StudentCustomPlan | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [transactionId, setTransactionId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const [editGender, setEditGender] = useState<StudentGender>("boy");
  const [editSibling, setEditSibling] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null);

  const { year, month } = currentBillingPeriod();

  const loadProfile = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const [p, e, fp, cp, pay, att, bill] = await Promise.all([
        fetchStudentProfile(studentId),
        fetchStudentEnrollments(studentId),
        fetchStudentFeePlanEnrollments(studentId),
        fetchStudentCustomPlan(studentId),
        fetchStudentPayments(studentId),
        fetchStudentAttendance(studentId, HISTORY_PREVIEW_LIMIT),
        refreshStudentBilling(studentId, year, month),
      ]);
      setProfile(p);
      setEnrollments(e);
      setFeePlanEnrollments(fp);
      setCustomPlan(cp);
      setPayments(pay);
      setAttendance(att);
      setBilling(bill);
      if (p) {
        setEditGender(p.gender);
        setEditSibling(p.is_sibling_discount_eligible);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to load student profile.");
    } finally {
      setLoading(false);
    }
  }, [studentId, year, month]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleRefreshBilling() {
    if (!studentId) return;
    setRefreshing(true);
    try {
      const bill = await refreshStudentBilling(studentId, year, month);
      setBilling(bill);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to refresh fees.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRecordPayment() {
    if (!studentId || !billing) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Invalid amount", "Enter a payment amount greater than 0.");
      return;
    }

    setSavingPayment(true);
    try {
      await recordPayment({
        studentId,
        invoiceId: billing.invoice_id,
        amount,
        method: paymentMethod,
        paymentDate: `${paymentDate}T12:00:00`,
        transactionId: transactionId.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });
      const [bill, pay] = await Promise.all([
        refreshStudentBilling(studentId, year, month),
        fetchStudentPayments(studentId),
      ]);
      setBilling(bill);
      setPayments(pay);
      setPaymentModalVisible(false);
      setPaymentAmount("");
      setTransactionId("");
      setPaymentNotes("");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to record payment.");
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleSaveEdit() {
    if (!studentId) return;
    setSavingEdit(true);
    try {
      await updateStudentFlags(studentId, {
        gender: editGender,
        is_sibling_discount_eligible: editSibling,
      });
      const bill = await refreshStudentBilling(studentId, year, month);
      const p = await fetchStudentProfile(studentId);
      setProfile(p);
      setBilling(bill);
      setEditModalVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to update student.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function reloadEnrollmentsAndBilling() {
    if (!studentId) return;
    const [e, fp, cp, bill] = await Promise.all([
      fetchStudentEnrollments(studentId),
      fetchStudentFeePlanEnrollments(studentId),
      fetchStudentCustomPlan(studentId),
      refreshStudentBilling(studentId, year, month),
    ]);
    setEnrollments(e);
    setFeePlanEnrollments(fp);
    setCustomPlan(cp);
    setBilling(bill);
  }

  function openEnrollModal() {
    if (!profile?.branch_id) {
      Alert.alert("Branch missing", "Set the student's branch before adding enrollments.");
      return;
    }
    setEnrollModalVisible(true);
  }

  function confirmRemoveEnrollment(batchId: string, batchLabel: string) {
    Alert.alert(
      "Remove from batch",
      `Remove this student from ${batchLabel}? Monthly fees will update on refresh.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => handleRemoveEnrollment(batchId),
        },
      ]
    );
  }

  async function handleRemoveEnrollment(batchId: string) {
    if (!studentId) return;
    setRemoveBusyId(batchId);
    try {
      await removeStudentFromBatch(studentId, batchId);
      await reloadEnrollmentsAndBilling();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to remove enrollment.");
    } finally {
      setRemoveBusyId(null);
    }
  }

  function confirmRemoveFeePlan(feePlanId: string, label: string) {
    Alert.alert("Remove program", `Remove ${label} from this student?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => handleRemoveFeePlan(feePlanId),
      },
    ]);
  }

  async function handleRemoveFeePlan(feePlanId: string) {
    if (!studentId) return;
    setRemoveBusyId(feePlanId);
    try {
      await removeStudentFromFeePlan(studentId, feePlanId);
      await reloadEnrollmentsAndBilling();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to remove program.");
    } finally {
      setRemoveBusyId(null);
    }
  }

  function confirmRemoveCustomPlan() {
    Alert.alert("Remove custom plan", "Remove the custom day plan for this student?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: handleRemoveCustomPlan,
      },
    ]);
  }

  async function handleRemoveCustomPlan() {
    if (!studentId) return;
    setRemoveBusyId("custom");
    try {
      await removeStudentCustomPlan(studentId);
      await reloadEnrollmentsAndBilling();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to remove custom plan.");
    } finally {
      setRemoveBusyId(null);
    }
  }

  const hasAnyEnrollment =
    enrollments.length > 0 || feePlanEnrollments.length > 0 || customPlan != null;

  const studentFullName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : "";

  function openPaymentHistory() {
    if (!studentId) return;
    router.push({
      pathname: "/Student_Payment_History",
      params: { student_id: studentId, student_name: studentFullName },
    });
  }

  function openAttendanceHistory() {
    if (!studentId) return;
    router.push({
      pathname: "/Student_Attendance_History",
      params: { student_id: studentId, student_name: studentFullName },
    });
  }

  const showOverdueBanner =
    billing &&
    billing.balance_due > 0 &&
    billing.due_date &&
    new Date() > new Date(billing.due_date);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#116C1B" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.errorText}>Student not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
          <Text style={styles.backBtnText}>Back{batchName ? ` to ${batchName}` : ""}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditModalVisible(true)}>
          <Ionicons name="create-outline" size={18} color="white" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.studentName}>
            {profile.first_name} {profile.last_name}
          </Text>
          <Text style={styles.metaText}>
            {profile.parent_phone ? `Phone: ${profile.parent_phone}` : "No phone on file"}
          </Text>
          <Text style={styles.metaText}>
            {profile.branches?.branch_name ?? "Branch"} · {profile.gender === "boy" ? "Boy" : "Girl"}
            {profile.is_sibling_discount_eligible ? " · Sibling discount" : ""}
          </Text>
        </View>

        {showOverdueBanner && (
          <View style={styles.overdueBanner}>
            <Ionicons name="warning-outline" size={20} color="#fff" />
            <Text style={styles.overdueText}>
              Fees due before the 7th — balance {formatOmr(billing!.balance_due)}
            </Text>
          </View>
        )}

        <Section
          title="Enrollments"
          action={
            <TouchableOpacity onPress={openEnrollModal}>
              <Text style={styles.linkText}>Add enrollment</Text>
            </TouchableOpacity>
          }
        >
          {!hasAnyEnrollment ? (
            <Text style={styles.emptyText}>No enrollments yet.</Text>
          ) : null}

          {enrollments.map((e) => (
            <View key={e.batch_id} style={styles.enrollmentRow}>
              <View style={styles.enrollmentInfo}>
                <Text style={styles.enrollmentKind}>Squad batch</Text>
                <Text style={styles.rowTitle}>{e.batch_name}</Text>
                <Text style={styles.rowSub}>{e.fee_plan_name ?? "Standard plan"}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => confirmRemoveEnrollment(e.batch_id, e.batch_name)}
                disabled={removeBusyId === e.batch_id}
              >
                {removeBusyId === e.batch_id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="close-circle-outline" size={22} color="#BD1F14" />
                )}
              </TouchableOpacity>
            </View>
          ))}

          {feePlanEnrollments.map((fp) => {
            const plan = fp.fee_plan_templates;
            const code = plan?.plan_code ?? "";
            return (
              <View key={fp.enrollment_id} style={styles.enrollmentRow}>
                <View style={styles.enrollmentInfo}>
                  <Text style={styles.enrollmentKind}>Fee program</Text>
                  <Text style={styles.rowTitle}>{plan?.display_name ?? "Program"}</Text>
                  <Text style={styles.rowSub}>
                    {FEE_PROGRAM_SCHEDULES[code] ?? "Program enrollment"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() =>
                    confirmRemoveFeePlan(fp.fee_plan_id, plan?.display_name ?? "program")
                  }
                  disabled={removeBusyId === fp.fee_plan_id}
                >
                  {removeBusyId === fp.fee_plan_id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="close-circle-outline" size={22} color="#BD1F14" />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          {customPlan ? (
            <View style={styles.enrollmentRow}>
              <View style={styles.enrollmentInfo}>
                <Text style={styles.enrollmentKind}>Custom days</Text>
                <Text style={styles.rowTitle}>
                  {customPlan.plan_label ?? `${customPlan.days_per_week} days/week`}
                </Text>
                <Text style={styles.rowSub}>{customPlan.selected_days.join(", ")}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={confirmRemoveCustomPlan}
                disabled={removeBusyId === "custom"}
              >
                {removeBusyId === "custom" ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="close-circle-outline" size={22} color="#BD1F14" />
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </Section>

        <Section
          title={`Fees — ${monthLabel(year, month)}`}
          action={
            <TouchableOpacity onPress={handleRefreshBilling} disabled={refreshing}>
              <Text style={styles.linkText}>{refreshing ? "Refreshing…" : "Refresh fees"}</Text>
            </TouchableOpacity>
          }
        >
          {billing ? (
            <>
              {billing.line_items.map((li) => (
                <View key={li.line_item_id} style={styles.feeRow}>
                  <Text style={styles.feeDesc}>{li.description}</Text>
                  <Text style={[styles.feeAmount, li.amount < 0 && styles.discountAmount]}>
                    {formatOmr(li.amount)}
                  </Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.feeRow}>
                <Text style={styles.totalLabel}>Total due</Text>
                <Text style={styles.totalValue}>{formatOmr(billing.total_due)}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.metaText}>Paid</Text>
                <Text style={styles.metaText}>{formatOmr(billing.amount_paid)}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.balanceLabel}>Balance</Text>
                <Text style={styles.balanceValue}>{formatOmr(billing.balance_due)}</Text>
              </View>
              <Text style={styles.statusChip}>
                Status: {billing.status} · Due {formatDate(billing.due_date)}
              </Text>
              {billing.balance_due > 0 && (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setPaymentModalVisible(true)}
                >
                  <Ionicons name="cash-outline" size={20} color="white" />
                  <Text style={styles.primaryBtnText}>Record payment</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No billing data.</Text>
          )}
        </Section>

        <Section
          title="Payment history"
          action={
            payments.length > 0 ? (
              <TouchableOpacity onPress={openPaymentHistory}>
                <Text style={styles.linkText}>View all</Text>
              </TouchableOpacity>
            ) : undefined
          }
        >
          {payments.length === 0 ? (
            <Text style={styles.emptyText}>No payments recorded.</Text>
          ) : (
            <>
              {payments.slice(0, HISTORY_PREVIEW_LIMIT).map((p) => (
                <View key={p.payment_id} style={styles.rowItem}>
                  <View style={styles.paymentRowTop}>
                    <Text style={styles.rowTitle}>{formatOmr(Number(p.amount_paid))}</Text>
                    <Text style={styles.rowSub}>{formatDate(p.payment_date)}</Text>
                  </View>
                  <Text style={styles.rowSub}>
                    {p.payment_method ?? "—"}
                    {p.invoices
                      ? ` · ${monthLabel(p.invoices.billing_year, p.invoices.billing_month)}`
                      : ""}
                  </Text>
                  {p.notes ? <Text style={styles.rowSub}>{p.notes}</Text> : null}
                </View>
              ))}
              <TouchableOpacity style={styles.viewAllBtn} onPress={openPaymentHistory}>
                <Ionicons name="list-outline" size={18} color="white" />
                <Text style={styles.viewAllBtnText}>View full payment history</Text>
              </TouchableOpacity>
            </>
          )}
        </Section>

        <Section
          title="Attendance (recent)"
          action={
            attendance.length > 0 ? (
              <TouchableOpacity onPress={openAttendanceHistory}>
                <Text style={styles.linkText}>View all</Text>
              </TouchableOpacity>
            ) : undefined
          }
        >
          {attendance.length === 0 ? (
            <Text style={styles.emptyText}>No attendance records.</Text>
          ) : (
            <>
              {attendance.map((a) => (
                <View key={a.attendance_id} style={styles.attendanceRow}>
                  <Text style={styles.rowTitle}>{formatDate(a.date)}</Text>
                  <Text style={styles.rowSub}>
                    {a.batches?.batch_name ?? "Batch"} · {a.status}
                  </Text>
                </View>
              ))}
              <TouchableOpacity style={styles.viewAllBtn} onPress={openAttendanceHistory}>
                <Ionicons name="calendar-outline" size={18} color="white" />
                <Text style={styles.viewAllBtnText}>View full attendance history</Text>
              </TouchableOpacity>
            </>
          )}
        </Section>
      </ScrollView>

      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record payment</Text>
            <Text style={styles.modalLabel}>Amount (OMR)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="0.00"
              placeholderTextColor="#888"
            />
            <Text style={styles.modalLabel}>Method</Text>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.methodChip, paymentMethod === m.value && styles.methodChipActive]}
                  onPress={() => setPaymentMethod(m.value)}
                >
                  <Text
                    style={[
                      styles.methodChipText,
                      paymentMethod === m.value && styles.methodChipTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>Payment date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={paymentDate}
              onChangeText={setPaymentDate}
              placeholder="2026-06-07"
              placeholderTextColor="#888"
            />
            <Text style={styles.modalLabel}>Reference / transaction ID (optional)</Text>
            <TextInput
              style={styles.input}
              value={transactionId}
              onChangeText={setTransactionId}
              placeholderTextColor="#888"
            />
            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              value={paymentNotes}
              onChangeText={setPaymentNotes}
              placeholderTextColor="#888"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setPaymentModalVisible(false)}
                disabled={savingPayment}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleRecordPayment}
                disabled={savingPayment}
              >
                {savingPayment ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit student</Text>
            <Text style={styles.modalLabel}>Gender (affects monthly fee)</Text>
            <View style={styles.methodRow}>
              {(["boy", "girl"] as StudentGender[]).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.methodChip, editGender === g && styles.methodChipActive]}
                  onPress={() => setEditGender(g)}
                >
                  <Text
                    style={[
                      styles.methodChipText,
                      editGender === g && styles.methodChipTextActive,
                    ]}
                  >
                    {g === "boy" ? "Boy" : "Girl"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.modalLabel}>Sibling discount eligible (boys)</Text>
              <Switch
                value={editSibling}
                onValueChange={setEditSibling}
                disabled={editGender !== "boy"}
                trackColor={{ false: "#555", true: "#116C1B" }}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={savingEdit}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <EnrollStudentModal
        visible={enrollModalVisible}
        onClose={() => setEnrollModalVisible(false)}
        studentId={studentId ?? ""}
        branchId={profile.branch_id}
        gender={profile.gender}
        enrolledBatchIds={enrollments.map((e) => e.batch_id)}
        enrolledFeePlanIds={feePlanEnrollments.map((e) => e.fee_plan_id)}
        onEnrolled={reloadEnrollmentsAndBilling}
      />
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1c1c",
    paddingHorizontal: 24,
  },
  centerFill: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#4d1212",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: "white",
    fontSize: 15,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editBtnText: {
    color: "white",
    fontSize: 15,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  studentName: {
    color: "white",
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
  },
  metaText: {
    color: "#ccc",
    fontSize: 14,
    marginTop: 4,
  },
  overdueBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#BD1F14",
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  overdueText: {
    color: "white",
    flex: 1,
    fontSize: 14,
  },
  section: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  linkText: {
    color: "#6fcf7a",
    fontSize: 14,
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
  },
  rowItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a3a",
  },
  enrollmentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a3a",
  },
  enrollmentInfo: {
    flex: 1,
    paddingRight: 12,
  },
  enrollmentKind: {
    color: "#6fcf7a",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  removeBtn: {
    padding: 4,
  },
  batchPickerList: {
    maxHeight: 320,
    marginVertical: 12,
  },
  batchPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a3a",
  },
  modalHint: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 8,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#333",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  viewAllBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  rowTitle: {
    color: "white",
    fontSize: 15,
  },
  rowSub: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 2,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  feeDesc: {
    color: "#ddd",
    flex: 1,
    fontSize: 14,
    paddingRight: 12,
  },
  feeAmount: {
    color: "white",
    fontSize: 14,
  },
  discountAmount: {
    color: "#6fcf7a",
  },
  divider: {
    height: 1,
    backgroundColor: "#444",
    marginVertical: 8,
  },
  totalLabel: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  totalValue: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  balanceLabel: {
    color: "#f5c542",
    fontWeight: "600",
    fontSize: 15,
  },
  balanceValue: {
    color: "#f5c542",
    fontWeight: "600",
    fontSize: 15,
  },
  statusChip: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#116C1B",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 14,
  },
  primaryBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  paymentRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  attendanceRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a3a",
  },
  errorText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#2a2a2a",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    maxHeight: "90%",
  },
  modalTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  modalLabel: {
    color: "#ccc",
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#1c1c1c",
    color: "white",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  methodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#444",
  },
  methodChipActive: {
    backgroundColor: "#116C1B",
  },
  methodChipText: {
    color: "#ccc",
    fontSize: 13,
  },
  methodChipTextActive: {
    color: "white",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  },
  secondaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: "#aaa",
    fontSize: 16,
  },
});

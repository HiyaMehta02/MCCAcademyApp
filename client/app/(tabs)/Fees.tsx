import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useBranch } from "../../contexts/BranchContext";
import {
  PendingFeeRow,
  billingPeriodLabel,
  fetchFeeReminderDays,
  fetchIsAdmin,
  fetchPendingFees,
  formatDueDate,
  formatOmr,
  isFeeReminderDayToday,
  summarizeFees,
} from "../../lib/feesDashboard";

type ScopeFilter = "all" | "branch";

function urgencyStyles(urgency: PendingFeeRow["urgency"]) {
  if (urgency === "overdue") {
    return {
      row: styles.rowOverdue,
      badge: styles.badgeOverdue,
      badgeText: "Overdue",
    };
  }
  if (urgency === "due_soon") {
    return {
      row: styles.rowDueSoon,
      badge: styles.badgeDueSoon,
      badgeText: "Due soon",
    };
  }
  return {
    row: styles.rowPending,
    badge: styles.badgePending,
    badgeText: "Pending",
  };
}

function FeeRow({ item, onPress }: { item: PendingFeeRow; onPress: () => void }) {
  const stylesForUrgency = urgencyStyles(item.urgency);
  const studentName = `${item.student_first_name} ${item.student_last_name}`.trim();

  return (
    <TouchableOpacity
      style={[styles.row, stylesForUrgency.row]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.rowMain}>
        <Text style={styles.studentName}>{studentName}</Text>
        <Text style={styles.metaText}>
          {item.branch_name ?? "Branch"} · {item.batch_name ?? "No batch"}
        </Text>
        <Text style={styles.metaText}>
          {billingPeriodLabel(item.billing_year, item.billing_month)} · Due{" "}
          {formatDueDate(item.due_date)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <View style={[styles.badge, stylesForUrgency.badge]}>
          <Text style={styles.badgeLabel}>{stylesForUrgency.badgeText}</Text>
        </View>
        <Text style={styles.balanceText}>{formatOmr(item.balance_due)}</Text>
        <Feather name="chevron-right" size={20} color="#aaa" />
      </View>
    </TouchableOpacity>
  );
}

export default function FeesScreen() {
  const { branch } = useBranch();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<PendingFeeRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [showReminderBanner, setShowReminderBanner] = useState(false);

  const loadFees = useCallback(async () => {
    setLoadError(null);
    const [admin, reminderDays] = await Promise.all([
      fetchIsAdmin(),
      fetchFeeReminderDays().catch(() => [15, 25]),
    ]);
    setIsAdmin(admin);

    const effectiveScope: ScopeFilter =
      admin ? scope : branch?.branchId ? "branch" : "all";
    const branchFilter =
      effectiveScope === "branch" && branch?.branchId ? branch.branchId : null;

    if (!admin && !branch?.branchId) {
      setRows([]);
      setShowReminderBanner(false);
      setLoadError("Select a branch from the coach menu to view fees for your branch.");
      return;
    }

    const data = await fetchPendingFees(branchFilter);
    setRows(data);
    setShowReminderBanner(isFeeReminderDayToday(reminderDays) && data.length > 0);
  }, [branch?.branchId, scope]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      try {
        await loadFees();
      } catch (err: unknown) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Could not load pending fees.";
        setLoadError(message);
        setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [loadFees]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadFees();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not refresh fees.";
      setLoadError(message);
    } finally {
      setRefreshing(false);
    }
  }

  const summary = useMemo(() => summarizeFees(rows), [rows]);

  const scopeLabel =
    scope === "branch" && branch?.branchName
      ? branch.branchName
      : "All branches";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.logoGroup}>
          <Image source={require("../../images/Logo.png")} style={styles.logoImage} />
          <View style={styles.logoContainer}>
            <Text style={styles.logoTopText}>PENDING FEES</Text>
            <Text style={styles.scopeSubtext}>{scopeLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryOverdue]}>
          <Text style={styles.summaryValue}>{summary.overdueCount}</Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryDueSoon]}>
          <Text style={styles.summaryValue}>{summary.dueSoonCount}</Text>
          <Text style={styles.summaryLabel}>Due soon</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryPending]}>
          <Text style={styles.summaryValue}>{summary.pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryTotal]}>
          <Text style={styles.summaryValueSmall}>{formatOmr(summary.totalBalance)}</Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
        </View>
      </View>

      {showReminderBanner ? (
        <View style={styles.reminderBanner}>
          <Ionicons name="alert-circle" size={18} color="#fff" />
          <Text style={styles.reminderText}>
            Fee reminder day — {rows.length} student{rows.length === 1 ? "" : "s"} still unpaid
          </Text>
        </View>
      ) : null}

      {isAdmin ? (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, scope === "all" && styles.filterChipActive]}
            onPress={() => setScope("all")}
          >
            <Text style={[styles.filterChipText, scope === "all" && styles.filterChipTextActive]}>
              All branches
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              scope === "branch" && styles.filterChipActive,
              !branch?.branchId && styles.filterChipDisabled,
            ]}
            disabled={!branch?.branchId}
            onPress={() => setScope("branch")}
          >
            <Text
              style={[
                styles.filterChipText,
                scope === "branch" && styles.filterChipTextActive,
              ]}
            >
              {branch?.branchName ?? "Current branch"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.greenCard}>
        {loading ? (
          <ActivityIndicator size="large" color="white" style={{ marginTop: 50 }} />
        ) : loadError ? (
          <View style={styles.centerMessage}>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.invoice_id}
            renderItem={({ item }) => (
              <FeeRow
                item={item}
                onPress={() =>
                  router.push({
                    pathname: "/Student_Profile",
                    params: {
                      student_id: item.student_id,
                      batch_name: item.batch_name ?? "",
                    },
                  })
                }
              />
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No pending fees for this view.</Text>
            }
            contentContainerStyle={rows.length === 0 ? styles.emptyList : undefined}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-undo-sharp" size={20} color="white" />
          <Text style={styles.footerBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#181818", paddingHorizontal: 40 },
  header: { flexDirection: "row", alignItems: "center", marginVertical: 24, paddingLeft: 48 },
  logoContainer: { borderLeftWidth: 3, borderLeftColor: "#BD1F14", paddingLeft: 10, marginLeft: 10 },
  logoGroup: { flexDirection: "row", alignItems: "center", flex: 1 },
  logoImage: { height: 72, width: 54, resizeMode: "contain" },
  logoTopText: { color: "white", fontSize: 34, fontWeight: "300", letterSpacing: 1 },
  scopeSubtext: { color: "#aaa", fontSize: 14, marginTop: 4 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  summaryOverdue: { backgroundColor: "#5c1515" },
  summaryDueSoon: { backgroundColor: "#6b4f0f" },
  summaryPending: { backgroundColor: "#2f2f2f" },
  summaryTotal: { backgroundColor: "#0f3d22" },
  summaryValue: { color: "#fff", fontSize: 22, fontWeight: "700" },
  summaryValueSmall: { color: "#fff", fontSize: 14, fontWeight: "700", textAlign: "center" },
  summaryLabel: { color: "#ddd", fontSize: 11, marginTop: 2, textAlign: "center" },
  reminderBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#5c1515",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  reminderText: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1 },
  filterRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  filterChip: {
    backgroundColor: "#2C2C2C",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipActive: { backgroundColor: "#fff" },
  filterChipDisabled: { opacity: 0.45 },
  filterChipText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  filterChipTextActive: { color: "#111" },
  greenCard: { flex: 1, backgroundColor: "#00703c", borderRadius: 40, padding: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f1f1f",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  rowOverdue: { borderLeftColor: "#e53935" },
  rowDueSoon: { borderLeftColor: "#ffb300" },
  rowPending: { borderLeftColor: "#666" },
  rowMain: { flex: 1, paddingRight: 8 },
  rowRight: { alignItems: "flex-end", gap: 6 },
  studentName: { color: "#fff", fontSize: 17, fontWeight: "700" },
  metaText: { color: "#aaa", fontSize: 13, marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeOverdue: { backgroundColor: "#5c1515" },
  badgeDueSoon: { backgroundColor: "#6b4f0f" },
  badgePending: { backgroundColor: "#333" },
  badgeLabel: { color: "#fff", fontSize: 11, fontWeight: "700" },
  balanceText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  centerMessage: { alignItems: "center", marginTop: 40, paddingHorizontal: 16 },
  errorText: { color: "#fff", textAlign: "center", marginBottom: 16, lineHeight: 22 },
  retryBtn: {
    backgroundColor: "#4d1212",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  emptyText: { color: "#fff", textAlign: "center", marginTop: 40, fontSize: 16 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  footer: { flexDirection: "row", paddingVertical: 24 },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4d1212",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  footerBtnText: { color: "white", fontSize: 16 },
});

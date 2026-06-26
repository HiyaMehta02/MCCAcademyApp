import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  PaymentRecord,
  fetchStudentPayments,
} from "../../lib/studentProfile";

const PREVIEW_LIMIT = 5;

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

function PaymentRow({ item }: { item: PaymentRecord }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.amount}>{formatOmr(Number(item.amount_paid))}</Text>
        <Text style={styles.date}>{formatDate(item.payment_date)}</Text>
      </View>
      <Text style={styles.meta}>
        {item.payment_method ?? "—"}
        {item.invoices
          ? ` · ${monthLabel(item.invoices.billing_year, item.invoices.billing_month)}`
          : ""}
      </Text>
      {item.transaction_id ? (
        <Text style={styles.meta}>Ref: {item.transaction_id}</Text>
      ) : null}
      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
    </View>
  );
}

export default function StudentPaymentHistoryScreen() {
  const params = useLocalSearchParams();
  const studentId = Array.isArray(params.student_id) ? params.student_id[0] : params.student_id;
  const studentName = Array.isArray(params.student_name) ? params.student_name[0] : params.student_name;

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const rows = await fetchStudentPayments(studentId);
      setPayments(rows);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to load payment history.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Payment history</Text>
          {studentName ? <Text style={styles.subtitle}>{studentName}</Text> : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#116C1B" />
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.empty}>No payments recorded.</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.payment_id}
          renderItem={({ item }) => <PaymentRow item={item} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1c1c",
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
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
  title: { color: "white", fontSize: 22, fontWeight: "600" },
  subtitle: { color: "#aaa", fontSize: 14, marginTop: 2 },
  centerFill: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: "#888", fontSize: 16 },
  listContent: { paddingBottom: 32 },
  row: {
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 14,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: { color: "white", fontSize: 17, fontWeight: "600" },
  date: { color: "#aaa", fontSize: 14 },
  meta: { color: "#aaa", fontSize: 13, marginTop: 4 },
  notes: { color: "#ccc", fontSize: 13, marginTop: 6, fontStyle: "italic" },
  separator: { height: 10 },
});

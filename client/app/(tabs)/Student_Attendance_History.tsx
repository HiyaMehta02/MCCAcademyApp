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
  AttendanceRecord,
  fetchStudentAttendance,
} from "../../lib/studentProfile";

export const ATTENDANCE_PREVIEW_LIMIT = 5;

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function AttendanceRow({ item }: { item: AttendanceRecord }) {
  return (
    <View style={styles.row}>
      <Text style={styles.date}>{formatDate(item.date)}</Text>
      <Text style={styles.meta}>
        {item.batches?.batch_name ?? "Batch"} · {item.status}
      </Text>
    </View>
  );
}

export default function StudentAttendanceHistoryScreen() {
  const params = useLocalSearchParams();
  const studentId = Array.isArray(params.student_id) ? params.student_id[0] : params.student_id;
  const studentName = Array.isArray(params.student_name) ? params.student_name[0] : params.student_name;

  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const rows = await fetchStudentAttendance(studentId);
      setAttendance(rows);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to load attendance history.");
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
          <Text style={styles.title}>Attendance history</Text>
          {studentName ? <Text style={styles.subtitle}>{studentName}</Text> : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#116C1B" />
        </View>
      ) : attendance.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.empty}>No attendance records.</Text>
        </View>
      ) : (
        <FlatList
          data={attendance}
          keyExtractor={(item) => item.attendance_id}
          renderItem={({ item }) => <AttendanceRow item={item} />}
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
  date: { color: "white", fontSize: 16, fontWeight: "500" },
  meta: { color: "#aaa", fontSize: 13, marginTop: 4 },
  separator: { height: 10 },
});

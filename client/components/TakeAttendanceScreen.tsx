import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Animated,
  PanResponder,
  Button,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { fetchStudentsForBatch } from "../lib/dataFromSupabase";
import { getApiBaseUrl } from "../lib/apiBaseUrl";
import { getCoachAuthHeaders } from "../lib/apiAuth";
import {
  AttendanceStatus,
  fetchBatchAttendanceForDate,
  setStudentAttendance,
  todayDateString,
} from "../lib/attendance";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveLayout } from "../lib/useResponsiveLayout";

interface Student {
  student_id: string;
  students: {
    first_name: string;
    last_name: string;
    status: string;
  };
}

export default function TakeAttendance() {
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const { batch_id } = useLocalSearchParams();
  const batchId = Array.isArray(batch_id) ? batch_id[0] : batch_id;
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceToday, setAttendanceToday] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceBusyId, setAttendanceBusyId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const sessionDate = todayDateString();

  const screenHeight = layout.height;
  const screenWidth = layout.width;
  const gridPadding = layout.isTablet ? 20 : 16;
  const numColumns = layout.attendanceGridColumns;
  const cardWidth = layout.attendanceCardWidth;
  const cardMargin = layout.cardMargin;

  const START_HEIGHT = screenHeight * 0.75;
  const OPEN_HEIGHT = screenHeight * 0.2;

  const translateY = useRef(new Animated.Value(START_HEIGHT)).current;
  const lastScrollY = useRef(START_HEIGHT);

  useEffect(() => {
    translateY.setValue(START_HEIGHT);
    lastScrollY.current = START_HEIGHT;
  }, [START_HEIGHT, translateY]);

  useEffect(() => {
    async function fetchStudents() {
      if (!batchId) return;
      try {
        setFetching(true);
        const [rows, attendanceMap] = await Promise.all([
          fetchStudentsForBatch(batchId),
          fetchBatchAttendanceForDate(batchId, sessionDate),
        ]);
        setStudents(rows);
        setAttendanceToday(attendanceMap);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setFetching(false);
      }
    }
    fetchStudents();
  }, [batchId, sessionDate]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) => Math.abs(gestureState.dy) > 5,
        onPanResponderMove: (_e, gestureState) => {
          const newValue = lastScrollY.current + gestureState.dy;
          if (newValue > OPEN_HEIGHT && newValue < screenHeight * 0.95) {
            translateY.setValue(newValue);
          }
        },
        onPanResponderRelease: (_e, gestureState) => {
          if (gestureState.dy < -50) {
            Animated.spring(translateY, { toValue: OPEN_HEIGHT, useNativeDriver: true }).start();
            lastScrollY.current = OPEN_HEIGHT;
          } else {
            Animated.spring(translateY, { toValue: START_HEIGHT, useNativeDriver: true }).start();
            lastScrollY.current = START_HEIGHT;
          }
        },
      }),
    [OPEN_HEIGHT, START_HEIGHT, screenHeight, translateY]
  );

  const handleAttendance = async () => {
    if (!selectedStudent) {
      Alert.alert("No Selection", "Please select a student from the list first.");
      return;
    }
    if (!cameraRef.current) return;

    const SERVER_URL = getApiBaseUrl();
    if (!SERVER_URL) {
      Alert.alert(
        "Missing API URL",
        "Set EXPO_PUBLIC_API_BASE_URL (e.g. http://YOUR_PC_IP:8000) or EXPO_PUBLIC_IP_ADDRESS in client/.env (no spaces around =)."
      );
      return;
    }

    try {
      setIsLoading(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });

      const formData = new FormData();
      formData.append("student_id", selectedStudent.student_id);
      formData.append("batch_id", batchId as string);
      formData.append("file", {
        uri: photo.uri,
        name: "attendance.jpg",
        type: "image/jpeg",
      } as any);

      let authHeaders: Record<string, string>;
      try {
        authHeaders = await getCoachAuthHeaders();
      } catch {
        Alert.alert("Not signed in", "Please log in again to mark attendance.");
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120_000);
      let response: Response;
      try {
        response = await fetch(`${SERVER_URL}/check-attendance`, {
          method: "POST",
          headers: authHeaders,
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        Alert.alert(
          "Network Error",
          `Could not reach:\n${SERVER_URL}/check-attendance\n\n${msg}\n\n• Run your API on port 8000\n• Same Wi‑Fi as this device\n• Use EXPO_PUBLIC_API_BASE_URL in .env\n• Rebuild dev client after app.config.js change.`
        );
        return;
      } finally {
        clearTimeout(timeoutId);
      }

      let result: { error?: string } = {};
      try {
        const text = await response.text();
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { error: `HTTP ${response.status} (not JSON)` };
      }

      if (response.ok) {
        setAttendanceToday((prev) => ({
          ...prev,
          [selectedStudent.student_id]: "Present",
        }));
        Alert.alert("Success", `Attendance marked for ${selectedStudent.students.first_name}`);
        setSelectedStudent(null);
      } else {
        Alert.alert("Error", result.error || "Recognition failed.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      Alert.alert(
        "Error",
        error instanceof Error && error.name === "AbortError"
          ? `Timed out calling ${SERVER_URL}/check-attendance`
          : msg
      );
    } finally {
      setIsLoading(false);
    }
  };

  async function toggleManualAttendance(studentId: string) {
    if (!batchId) return;
    const current = attendanceToday[studentId];
    const nextStatus: AttendanceStatus = current === "Present" ? "Absent" : "Present";

    setAttendanceBusyId(studentId);
    try {
      await setStudentAttendance(studentId, batchId, sessionDate, nextStatus);
      setAttendanceToday((prev) => ({ ...prev, [studentId]: nextStatus }));
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to update attendance.");
    } finally {
      setAttendanceBusyId(null);
    }
  }

  const filteredStudents = students.filter((s) =>
    `${s.students?.first_name} ${s.students?.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const headerInset = layout.isTablet ? 40 : 16;
  const headerTop = layout.isTablet ? 50 : insets.top + 8;
  const cardHeight = cardWidth * (layout.isPhone ? 1.55 : 1.45);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera access needed</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="front" ref={cameraRef} />

      <View style={[styles.topHeader, { top: headerTop, left: headerInset, right: headerInset }]}>
        <TouchableOpacity style={[styles.backBtn, layout.isPhone && styles.backBtnPhone]} onPress={() => router.back()}>
          <Ionicons name="arrow-undo-sharp" size={18} color="white" />
          {!layout.isPhone && <Text style={styles.backBtnText}>Back</Text>}
        </TouchableOpacity>

        {selectedStudent && (
          <View style={[styles.activeLabel, layout.isPhone && styles.activeLabelPhone]}>
            <Text style={styles.activeText} numberOfLines={1}>
              {layout.isPhone ? selectedStudent.students.first_name : `Scanning: ${selectedStudent.students.first_name}`}
            </Text>
          </View>
        )}

        <View style={[styles.cameraTriggerContainer, layout.isPhone && styles.cameraTriggerPhone]}>
          <TouchableOpacity
            style={[styles.captureCircle, layout.isPhone && styles.captureCirclePhone, isLoading && { opacity: 0.5 }]}
            onPress={handleAttendance}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="black" /> : <View style={styles.captureInner} />}
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.faceHint, { bottom: screenHeight * 0.27 }]} pointerEvents="none">
        <Text style={styles.faceHintText}>Only one face should be visible in the frame.</Text>
      </View>

      <Animated.View
        style={[
          styles.bottomSheet,
          {
            width: screenWidth,
            height: screenHeight,
            paddingHorizontal: gridPadding,
            transform: [{ translateY }],
          },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={styles.handle} />
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#666" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Students..."
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {fetching ? (
          <ActivityIndicator size="large" color="#116C1B" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            key={`attendance-grid-${numColumns}`}
            data={filteredStudents}
            numColumns={numColumns}
            keyExtractor={(item) => item.student_id}
            renderItem={({ item }) => {
              const isSelected = selectedStudent?.student_id === item.student_id;
              const status = attendanceToday[item.student_id];
              const isPresent = status === "Present";
              const isBusy = attendanceBusyId === item.student_id;

              return (
                <TouchableOpacity
                  style={[
                    styles.card,
                    { width: cardWidth, height: cardHeight, margin: cardMargin },
                    isSelected && styles.selectedCard,
                  ]}
                  onPress={() => setSelectedStudent(item)}
                  activeOpacity={0.85}
                >
                  <Image source={require("../images/student_image.jpg")} style={styles.studentImage} />
                  <View style={styles.nameLabel}>
                    <Text style={styles.nameText} numberOfLines={1}>
                      {item.students?.first_name}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.attendanceBtn,
                        isPresent ? styles.attendanceBtnAbsent : styles.attendanceBtnHere,
                      ]}
                      onPress={() => toggleManualAttendance(item.student_id)}
                      disabled={isBusy}
                      activeOpacity={0.8}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.attendanceBtnText}>
                          {isPresent ? "Mark as absent" : "Mark as here"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.listContent}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  topHeader: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4d1212",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  backBtnPhone: { paddingHorizontal: 12, paddingVertical: 10 },
  backBtnText: { color: "white", fontSize: 16 },
  activeLabel: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  activeLabelPhone: { flex: 0, maxWidth: 120, paddingHorizontal: 10 },
  activeText: { color: "#4CAF50", fontWeight: "bold", fontSize: 13 },
  faceHint: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    zIndex: 5,
  },
  faceHintText: { color: "#eee", fontSize: 12, textAlign: "center" },
  cameraTriggerContainer: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraTriggerPhone: { width: 52, height: 52, borderRadius: 26 },
  captureCircle: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  captureCirclePhone: { width: 44, height: 44, borderRadius: 22 },
  captureInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  bottomSheet: {
    position: "absolute",
    backgroundColor: "#1c1c1c",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  dragArea: { alignItems: "center", paddingVertical: 15 },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#444",
    borderRadius: 3,
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 15,
    width: "90%",
    height: 40,
  },
  searchInput: { flex: 1, color: "black", fontSize: 14 },
  listContent: { paddingBottom: 250 },
  card: {
    backgroundColor: "#333",
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedCard: { borderColor: "#4CAF50" },
  studentImage: { flex: 1, width: "100%", height: "100%", resizeMode: "cover" },
  nameLabel: {
    backgroundColor: "#2a2a2a",
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  nameText: { color: "white", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  attendanceBtn: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
  },
  attendanceBtnHere: { backgroundColor: "#116C1B" },
  attendanceBtnAbsent: { backgroundColor: "#BD1F14" },
  attendanceBtnText: { color: "white", fontSize: 11, fontWeight: "700", textAlign: "center" },
  permissionText: { color: "white", textAlign: "center", marginTop: 100 },
});

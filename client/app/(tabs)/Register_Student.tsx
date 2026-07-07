import React, { useEffect, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  BranchOption,
  CreateStudentInput,
  StudentGender,
  createStudent,
  enrollStudentInBatch,
  fetchBatchBranch,
  fetchBranches,
  refreshStudentBilling,
  currentBillingPeriod,
} from "../../lib/studentProfile";

export default function RegisterStudentScreen() {
  const params = useLocalSearchParams();
  const batchId = Array.isArray(params.batch_id) ? params.batch_id[0] : params.batch_id;
  const batchName = Array.isArray(params.batch_name) ? params.batch_name[0] : params.batch_name;
  const branchIdParam = Array.isArray(params.branch_id) ? params.branch_id[0] : params.branch_id;
  const branchNameParam = Array.isArray(params.branch_name) ? params.branch_name[0] : params.branch_name;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<StudentGender>("boy");
  const [parentPhone, setParentPhone] = useState("");
  const [dob, setDob] = useState("");
  const [siblingDiscount, setSiblingDiscount] = useState(false);
  const [referralMonth, setReferralMonth] = useState("");
  const [referralYear, setReferralYear] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const branchList = await fetchBranches();
        setBranches(branchList);

        let branchId = branchIdParam ?? "";
        if (!branchId && batchId) {
          branchId = (await fetchBatchBranch(batchId)) ?? "";
        }
        setSelectedBranchId(branchId);
      } catch (err: any) {
        Alert.alert("Error", err?.message ?? "Failed to load branches.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [batchId, branchIdParam]);

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Required fields", "First name and last name are required.");
      return;
    }
    if (!selectedBranchId) {
      Alert.alert("Branch required", "Select the student's branch.");
      return;
    }

    const input: CreateStudentInput = {
      first_name: firstName,
      last_name: lastName,
      gender,
      branch_id: selectedBranchId,
      parent_phone: parentPhone.trim() || undefined,
      dob: dob.trim() || undefined,
      is_sibling_discount_eligible: gender === "boy" ? siblingDiscount : false,
    };

    const refMonth = parseInt(referralMonth, 10);
    const refYear = parseInt(referralYear, 10);
    if (referralMonth.trim() && referralYear.trim()) {
      if (refMonth < 1 || refMonth > 12) {
        Alert.alert("Invalid referral month", "Use 1–12 for the referral discount month.");
        return;
      }
      input.referral_discount_month = refMonth;
      input.referral_discount_year = refYear;
    }

    setSaving(true);
    try {
      const studentId = await createStudent(input);

      if (batchId) {
        await enrollStudentInBatch(studentId, batchId);
        const { year, month } = currentBillingPeriod();
        await refreshStudentBilling(studentId, year, month);
      }

      Alert.alert(
        "Student registered",
        batchId
          ? `${firstName} ${lastName} was added and enrolled in ${batchName ?? "the batch"}.`
          : `${firstName} ${lastName} was added to the system.`,
        [
          {
            text: "View profile",
            onPress: () =>
              router.replace({
                pathname: "/Student_Profile",
                params: {
                  student_id: studentId,
                  batch_id: batchId ?? "",
                  batch_name: batchName ?? "",
                },
              }),
          },
          {
            text: batchId ? "Back to batch" : "Done",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to register student.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#116C1B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Register student</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        {batchId ? (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              Will enroll in: {batchName ?? "selected batch"} after registration
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Required</Text>
        <Field label="First name *" value={firstName} onChangeText={setFirstName} />
        <Field label="Last name *" value={lastName} onChangeText={setLastName} />

        <Text style={styles.fieldLabel}>Gender *</Text>
        <View style={styles.chipRow}>
          {(["boy", "girl"] as StudentGender[]).map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, gender === g && styles.chipActive]}
              onPress={() => {
                setGender(g);
                if (g !== "boy") setSiblingDiscount(false);
              }}
            >
              <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                {g === "boy" ? "Boy" : "Girl"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Branch *</Text>
        <View style={styles.chipRow}>
          {branches.map((b) => (
            <TouchableOpacity
              key={b.branch_id}
              style={[styles.chip, selectedBranchId === b.branch_id && styles.chipActive]}
              onPress={() => setSelectedBranchId(b.branch_id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedBranchId === b.branch_id && styles.chipTextActive,
                ]}
              >
                {b.branch_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {branchNameParam && !batchId ? (
          <Text style={styles.hint}>Default: {branchNameParam}</Text>
        ) : null}

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Optional</Text>
        <Field
          label="Parent phone"
          value={parentPhone}
          onChangeText={setParentPhone}
          keyboardType="phone-pad"
        />
        <Field
          label="Date of birth (YYYY-MM-DD)"
          value={dob}
          onChangeText={setDob}
          placeholder="2008-05-15"
        />

        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>Sibling discount (boys only)</Text>
          <Switch
            value={siblingDiscount}
            onValueChange={setSiblingDiscount}
            disabled={gender !== "boy"}
            trackColor={{ false: "#555", true: "#116C1B" }}
          />
        </View>

        <Text style={styles.fieldLabel}>Referral discount month (one-time)</Text>
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, styles.inlineInput]}
            value={referralMonth}
            onChangeText={setReferralMonth}
            placeholder="Month 1–12"
            placeholderTextColor="#888"
            keyboardType="number-pad"
          />
          <TextInput
            style={[styles.input, styles.inlineInput]}
            value={referralYear}
            onChangeText={setReferralYear}
            placeholder="Year"
            placeholderTextColor="#888"
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitBtnText}>Register student</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  placeholder?: string;
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#888"
      />
    </>
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
  backBtnText: {
    color: "white",
    fontSize: 15,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "600",
  },
  form: {
    paddingBottom: 40,
  },
  infoBanner: {
    backgroundColor: "#116C1B",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  infoBannerText: {
    color: "white",
    fontSize: 14,
  },
  sectionLabel: {
    color: "#6fcf7a",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldLabel: {
    color: "#ccc",
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#2a2a2a",
    color: "white",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#444",
  },
  chipActive: {
    backgroundColor: "#116C1B",
  },
  chipText: {
    color: "#ccc",
    fontSize: 13,
  },
  chipTextActive: {
    color: "white",
  },
  hint: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  inlineRow: {
    flexDirection: "row",
    gap: 10,
  },
  inlineInput: {
    flex: 1,
  },
  submitBtn: {
    backgroundColor: "#116C1B",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 28,
  },
  submitBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

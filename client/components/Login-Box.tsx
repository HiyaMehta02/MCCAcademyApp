import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Image,
  Pressable,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  ViewStyle,
} from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import { supabase } from "../lib/supabase";
import {
  GENERIC_LOGIN_ERROR,
  isValidLoginId,
  loginIdToAuthEmail,
  normalizeLoginId,
} from "../lib/coachAuth";

interface Branch {
  branch_id: string;
  branch_name: string;
}

type GreenBoxProps = {
  style?: StyleProp<ViewStyle>;
};

export default function GreenBox({ style }: GreenBoxProps) {
  const [authResolved, setAuthResolved] = useState(false);
  const [phase, setPhase] = useState<"login" | "branch">("login");
  const [hasSession, setHasSession] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [branchRetryToken, setBranchRetryToken] = useState(0);
  const [authLoading, setAuthLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const signedIn = !!data.session?.user;
      setHasSession(signedIn);
      setAuthResolved(true);
      if (signedIn) setPhase("branch");
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const signedIn = !!session?.user;
      setHasSession(signedIn);
      setAuthResolved(true);
      if (!signedIn) {
        setPhase("login");
        setLoginId("");
        setPassword("");
      } else {
        setPhase("branch");
      }
    });

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
    };
  }, []);

  const handleCoachLogin = async () => {
    const id = normalizeLoginId(loginId);
    if (!isValidLoginId(id)) {
      Alert.alert("Invalid Coach ID", "Use 3–32 characters: letters, numbers, dots, hyphens, or underscores.");
      return;
    }
    if (!password) {
      Alert.alert("Password required", "Enter your password.");
      return;
    }

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginIdToAuthEmail(id),
        password,
      });

      if (error) {
        Alert.alert("Sign in failed", GENERIC_LOGIN_ERROR);
        return;
      }
    } catch {
      Alert.alert("Sign in failed", GENERIC_LOGIN_ERROR);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleBranchConfirm = () => {
    router.push({
      pathname: "/Batch_Screen",
      params: {
        branch_id: selectedBranch?.branch_id,
        branch_name: selectedBranch?.branch_name,
      },
    });
  };

  useEffect(() => {
    if (phase !== "branch" || !hasSession) return;

    let cancelled = false;

    async function loadBranches() {
      setLoading(true);
      setBranchError(null);

      try {
        const { data, error } = await supabase
          .from("branches")
          .select("branch_id, branch_name")
          .or("status.eq.active,status.is.null")
          .order("branch_name");

        if (error) throw error;
        if (cancelled) return;

        if (data && data.length > 0) {
          setBranches(data);
          return;
        }
        setBranches([]);
        setBranchError("No branches found. Add rows in Supabase → public.branches.");
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not load branches.";
        console.error("loadBranches:", err);
        setBranchError(message);
        setBranches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBranches();
    return () => {
      cancelled = true;
    };
  }, [phase, branchRetryToken, hasSession]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.box, style]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
      {!authResolved ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
        </View>
      ) : null}

      {authResolved && phase === "login" && (
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Coach Login</Text>
          <Text style={styles.subtitle}>
            Sign in with your coach ID and password to access the MCC Academy system.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Coach ID</Text>
            <TextInput
              style={styles.input}
              value={loginId}
              onChangeText={setLoginId}
              placeholder="e.g. coach001"
              placeholderTextColor="#888"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!authLoading}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#888"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!authLoading}
                onSubmitEditing={handleCoachLogin}
                returnKeyType="go"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#444" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleCoachLogin}
            disabled={authLoading}
            style={[styles.primaryBtn, { opacity: authLoading ? 0.7 : 1 }]}
          >
            {authLoading ? (
              <ActivityIndicator color="#116C1B" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <Image source={require("../images/Logo.png")} style={styles.logo} />
        </View>
      )}

      {authResolved && phase === "branch" && hasSession && (
        <View style={styles.branchContainer}>
          <Text style={styles.branchTitle}>Select your branch</Text>

          {loading ? (
            <ActivityIndicator size="large" color="white" style={{ marginTop: 40 }} />
          ) : branchError ? (
            <View style={{ marginTop: 20, paddingHorizontal: 12, alignItems: "center" }}>
              <Text style={[styles.subtitle, { marginBottom: 16 }]}>{branchError}</Text>
              <TouchableOpacity
                style={styles.footerBtn}
                onPress={() => {
                  setBranchError(null);
                  setBranchRetryToken((n) => n + 1);
                }}
              >
                <Text style={styles.footerBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.branchGrid}>
                {branches.map((branch) => (
                  <Pressable
                    key={branch.branch_id}
                    onPress={() => setSelectedBranch(branch)}
                    style={[
                      styles.branchCard,
                      {
                        backgroundColor:
                          selectedBranch?.branch_id === branch.branch_id ? "#ffffff" : "#2C2C2C",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.branchCardText,
                        {
                          color:
                            selectedBranch?.branch_id === branch.branch_id ? "#2C2C2C" : "#ffffff",
                        },
                      ]}
                    >
                      {branch.branch_name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={() => {
                    supabase.auth.signOut();
                    setPhase("login");
                  }}
                  style={styles.footerBtn}
                >
                  <Ionicons name="log-out-outline" size={20} color="white" />
                  <Text style={styles.footerBtnText}>Sign out</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleBranchConfirm}
                  disabled={!selectedBranch}
                  style={[styles.footerBtn, !selectedBranch && { opacity: 0.4 }]}
                >
                  <Text style={styles.footerBtnText}>Next</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#116C1B",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
    overflow: "hidden",
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 4,
  },
  loadingContainer: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 8,
  },
  branchContainer: {
    marginTop: 8,
    alignItems: "center",
    width: "100%",
    paddingBottom: 8,
  },
  title: { color: "white", fontSize: 32, marginBottom: 8, fontWeight: "700", textAlign: "center" },
  subtitle: {
    color: "white",
    fontSize: 14,
    marginBottom: 16,
    width: "100%",
    maxWidth: 420,
    textAlign: "center",
    opacity: 0.9,
  },
  fieldGroup: { width: "100%", maxWidth: 420, marginBottom: 10 },
  label: { color: "rgba(255,255,255,0.95)", fontSize: 13, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111",
  },
  passwordRow: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 44 },
  eyeBtn: {
    position: "absolute",
    right: 10,
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  primaryBtn: {
    backgroundColor: "white",
    width: "100%",
    maxWidth: 420,
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  primaryBtnText: { color: "#116C1B", fontSize: 17, fontWeight: "700" },
  logo: { width: 40, height: 50, resizeMode: "contain", marginTop: 8 },
  branchTitle: { color: "white", fontSize: 24, textAlign: "center", marginBottom: 16 },
  branchGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 },
  branchCard: {
    padding: 16,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  branchCardText: { fontSize: 16, fontWeight: "600" },
  footer: { flexDirection: "row", marginTop: 20, gap: 16, flexWrap: "wrap", justifyContent: "center" },
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

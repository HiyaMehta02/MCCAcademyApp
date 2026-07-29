import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBranch } from "../contexts/BranchContext";
import { useCoachMenu } from "../contexts/CoachMenuContext";
import { supabase } from "../lib/supabase";

type Branch = {
  branch_id: string;
  branch_name: string;
};

type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  adminOnly?: boolean;
  action: () => void;
};

export default function CoachMenu() {
  const insets = useSafeAreaInsets();
  const { isOpen, closeMenu, isAdmin } = useCoachMenu();
  const { branch, setBranch, clearBranch } = useBranch();
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowBranchPicker(false);
      return;
    }

    let cancelled = false;

    async function loadBranches() {
      setBranchesLoading(true);
      try {
        const { data, error } = await supabase
          .from("branches")
          .select("branch_id, branch_name")
          .or("status.eq.active,status.is.null")
          .order("branch_name");

        if (cancelled) return;
        if (error) throw error;
        setBranches(data ?? []);
      } catch {
        if (!cancelled) setBranches([]);
      } finally {
        if (!cancelled) setBranchesLoading(false);
      }
    }

    loadBranches();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  function navigate(href: Href) {
    closeMenu();
    router.push(href);
  }

  async function handleSelectBranch(selected: Branch) {
    await setBranch(selected.branch_id, selected.branch_name);
    closeMenu();
    router.push({
      pathname: "/Batch_Screen",
      params: {
        branch_id: selected.branch_id,
        branch_name: selected.branch_name,
      },
    });
  }

  async function handleLogout() {
    closeMenu();
    await clearBranch();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const menuItems: MenuItem[] = [
    {
      key: "home",
      label: "Home",
      icon: "home-outline",
      action: () => navigate("/"),
    },
    {
      key: "switch-branch",
      label: "Switch branch",
      icon: "git-branch-outline",
      action: () => setShowBranchPicker((v) => !v),
    },
    {
      key: "batches",
      label: "Batches",
      icon: "grid-outline",
      action: () => {
        if (!branch) {
          setShowBranchPicker(true);
          return;
        }
        navigate({
          pathname: "/Batch_Screen",
          params: {
            branch_id: branch.branchId,
            branch_name: branch.branchName,
          },
        });
      },
    },
    {
      key: "fees",
      label: "Fees",
      icon: "cash-outline",
      action: () => navigate("/Fees" as Href),
    },
    {
      key: "coach-attendance",
      label: "Coach attendance",
      icon: "time-outline",
      action: () => navigate("/Coach_Attendance" as Href),
    },
    {
      key: "coach-requests",
      label: "Coach requests",
      icon: "shield-checkmark-outline",
      adminOnly: true,
      action: () => navigate("/Coach_Requests"),
    },
    {
      key: "manage-coaches",
      label: "Manage coaches",
      icon: "people-outline",
      adminOnly: true,
      action: () => navigate("/Manage_Coaches"),
    },
    {
      key: "import-data",
      label: "Import CSV",
      icon: "cloud-upload-outline",
      adminOnly: true,
      action: () => navigate("/Import_Data" as Href),
    },
    {
      key: "sheet-sync",
      label: "Google Sheet sync",
      icon: "logo-google",
      adminOnly: true,
      action: () => navigate("/Sheet_Sync" as Href),
    },
    {
      key: "logout",
      label: "Log out",
      icon: "log-out-outline",
      action: handleLogout,
    },
  ];

  const visibleItems = menuItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={closeMenu}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={closeMenu} accessibilityLabel="Close menu" />
        <View
          style={[
            styles.panel,
            {
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderText}>
              <Text style={styles.menuTitle}>Coach menu</Text>
              <Text style={styles.branchLabel}>
                {branch?.branchName ?? "No branch selected"}
              </Text>
            </View>
            <TouchableOpacity onPress={closeMenu} style={styles.closeBtn} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            {visibleItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.menuRow}
                onPress={item.action}
                activeOpacity={0.75}
              >
                <Ionicons name={item.icon} size={22} color="#fff" />
                <Text style={styles.menuRowText}>{item.label}</Text>
                {item.key === "switch-branch" ? (
                  <Ionicons
                    name={showBranchPicker ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#aaa"
                  />
                ) : null}
              </TouchableOpacity>
            ))}

            {showBranchPicker ? (
              <View style={styles.branchPicker}>
                {branchesLoading ? (
                  <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} />
                ) : branches.length === 0 ? (
                  <Text style={styles.branchEmpty}>No branches available.</Text>
                ) : (
                  branches.map((b) => {
                    const selected = branch?.branchId === b.branch_id;
                    return (
                      <TouchableOpacity
                        key={b.branch_id}
                        style={[styles.branchRow, selected && styles.branchRowSelected]}
                        onPress={() => handleSelectBranch(b)}
                      >
                        <Text style={[styles.branchRowText, selected && styles.branchRowTextSelected]}>
                          {b.branch_name}
                        </Text>
                        {selected ? (
                          <Ionicons name="checkmark-circle" size={18} color="#116C1B" />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  panel: {
    width: 320,
    maxWidth: "85%",
    backgroundColor: "#1f1f1f",
    borderLeftWidth: 3,
    borderLeftColor: "#BD1F14",
    paddingHorizontal: 16,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  panelHeaderText: {
    flex: 1,
  },
  menuTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  branchLabel: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 4,
  },
  closeBtn: {
    padding: 4,
  },
  menuScroll: {
    flex: 1,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
  menuRowText: {
    flex: 1,
    color: "#fff",
    fontSize: 17,
    fontWeight: "500",
  },
  branchPicker: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  branchEmpty: {
    color: "#aaa",
    fontSize: 14,
    padding: 8,
  },
  branchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  branchRowSelected: {
    backgroundColor: "#fff",
  },
  branchRowText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  branchRowTextSelected: {
    color: "#111",
  },
});

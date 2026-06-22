import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

function normalizePath(path: string | null | undefined): string {
  if (path == null || path === "") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

type GateState = {
  loading: boolean;
  signedIn: boolean;
  mustSetPassword: boolean;
  accessStatus: "approved" | "pending" | "rejected" | "suspended" | "none";
};

async function getAccessStatus(): Promise<Pick<GateState, "accessStatus" | "mustSetPassword">> {
  const { data: coachStatus } = await supabase.rpc("current_coach_status");
  const status =
    coachStatus === "approved" ||
    coachStatus === "pending" ||
    coachStatus === "rejected" ||
    coachStatus === "suspended"
      ? coachStatus
      : "none";

  let mustSetPassword = false;
  if (status === "approved") {
    const { data: mustChange } = await supabase.rpc("coach_must_set_password");
    mustSetPassword = Boolean(mustChange);
  }

  return { accessStatus: status, mustSetPassword };
}

export default function Layout() {
  const router = useRouter();
  const pathname = usePathname();
  const [gate, setGate] = useState<GateState>({
    loading: true,
    signedIn: false,
    mustSetPassword: false,
    accessStatus: "none",
  });

  useEffect(() => {
    let mounted = true;

    async function refreshGate() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session?.user) {
        setGate({
          loading: false,
          signedIn: false,
          mustSetPassword: false,
          accessStatus: "none",
        });
        return;
      }

      const { accessStatus, mustSetPassword } = await getAccessStatus();
      if (!mounted) return;
      setGate({
        loading: false,
        signedIn: true,
        mustSetPassword,
        accessStatus,
      });
    }

    refreshGate();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refreshGate();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const AUTH_ONLY_PREFIXES = [
    "/login",
    "/set-password",
    "/no-access",
    "/pending",
    "/rejected",
    "/suspended",
  ];

  useEffect(() => {
    if (gate.loading) return;

    const p = normalizePath(pathname);

    if (!gate.signedIn) {
      if (p !== "/login") {
        router.replace("/login");
      }
      return;
    }

    if (gate.mustSetPassword) {
      if (p !== "/set-password") router.replace("/set-password");
      return;
    }

    if (gate.accessStatus === "approved") {
      const onAuthOnlyScreen = AUTH_ONLY_PREFIXES.some(
        (route) => p === route || p.startsWith(`${route}/`)
      );
      if (onAuthOnlyScreen) {
        router.replace("/(tabs)");
      }
      return;
    }

    if (gate.accessStatus === "pending") {
      if (p !== "/pending") router.replace("/pending");
      return;
    }
    if (gate.accessStatus === "rejected") {
      if (p !== "/rejected") router.replace("/rejected");
      return;
    }
    if (gate.accessStatus === "suspended") {
      if (p !== "/suspended") router.replace("/suspended");
      return;
    }
    if (gate.accessStatus === "none") {
      if (p !== "/no-access") router.replace("/no-access");
    }
  }, [gate.loading, gate.signedIn, gate.mustSetPassword, gate.accessStatus, pathname, router]);

  if (gate.loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#181818" }}>
        <ActivityIndicator size="large" color="#116C1B" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="set-password" options={{ headerShown: false }} />
      <Stack.Screen name="no-access" options={{ headerShown: false }} />
      <Stack.Screen name="pending" options={{ headerShown: false }} />
      <Stack.Screen name="rejected" options={{ headerShown: false }} />
      <Stack.Screen name="suspended" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerTitle: "Home", headerShown: false }} />
    </Stack>
  );
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const BRANCH_ID_KEY = "@mccc/branch_id";
const BRANCH_NAME_KEY = "@mccc/branch_name";

export type BranchSelection = {
  branchId: string;
  branchName: string;
};

type BranchContextValue = {
  branch: BranchSelection | null;
  ready: boolean;
  setBranch: (branchId: string, branchName: string) => Promise<void>;
  clearBranch: () => Promise<void>;
};

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branch, setBranchState] = useState<BranchSelection | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [branchId, branchName] = await Promise.all([
          AsyncStorage.getItem(BRANCH_ID_KEY),
          AsyncStorage.getItem(BRANCH_NAME_KEY),
        ]);
        if (!mounted) return;
        if (branchId && branchName) {
          setBranchState({ branchId, branchName });
        }
      } finally {
        if (mounted) setReady(true);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const setBranch = useCallback(async (branchId: string, branchName: string) => {
    setBranchState({ branchId, branchName });
    await AsyncStorage.multiSet([
      [BRANCH_ID_KEY, branchId],
      [BRANCH_NAME_KEY, branchName],
    ]);
  }, []);

  const clearBranch = useCallback(async () => {
    setBranchState(null);
    await AsyncStorage.multiRemove([BRANCH_ID_KEY, BRANCH_NAME_KEY]);
  }, []);

  const value = useMemo(
    () => ({ branch, ready, setBranch, clearBranch }),
    [branch, ready, setBranch, clearBranch]
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error("useBranch must be used within BranchProvider");
  }
  return ctx;
}

/** Route params override persisted branch when present (deep links / legacy navigation). */
export function useEffectiveBranch(
  routeBranchId?: string | string[],
  routeBranchName?: string | string[]
): BranchSelection | null {
  const { branch } = useBranch();

  const paramId = Array.isArray(routeBranchId) ? routeBranchId[0] : routeBranchId;
  const paramName = Array.isArray(routeBranchName) ? routeBranchName[0] : routeBranchName;

  if (paramId && paramName) {
    return { branchId: paramId, branchName: paramName };
  }
  return branch;
}

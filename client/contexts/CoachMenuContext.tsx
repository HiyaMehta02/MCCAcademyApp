import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

type CoachMenuContextValue = {
  isOpen: boolean;
  isAdmin: boolean;
  hasSession: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  refreshAdmin: () => Promise<void>;
};

const CoachMenuContext = createContext<CoachMenuContextValue | null>(null);

export function CoachMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const refreshAdmin = useCallback(async () => {
    const { data } = await supabase.rpc("is_current_user_admin");
    setIsAdmin(Boolean(data));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function syncSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const signedIn = !!data.session?.user;
      setHasSession(signedIn);
      if (signedIn) {
        await refreshAdmin();
      } else {
        setIsAdmin(false);
        setIsOpen(false);
      }
    }

    syncSession();

    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      syncSession();
    });

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
    };
  }, [refreshAdmin]);

  useEffect(() => {
    if (isOpen && hasSession) {
      refreshAdmin();
    }
  }, [isOpen, hasSession, refreshAdmin]);

  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo(
    () => ({
      isOpen,
      isAdmin,
      hasSession,
      openMenu,
      closeMenu,
      toggleMenu,
      refreshAdmin,
    }),
    [isOpen, isAdmin, hasSession, openMenu, closeMenu, toggleMenu, refreshAdmin]
  );

  return <CoachMenuContext.Provider value={value}>{children}</CoachMenuContext.Provider>;
}

export function useCoachMenu() {
  const ctx = useContext(CoachMenuContext);
  if (!ctx) {
    throw new Error("useCoachMenu must be used within CoachMenuProvider");
  }
  return ctx;
}

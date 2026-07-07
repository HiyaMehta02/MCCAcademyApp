import { supabase } from "./supabase";

/** Bearer token for Face API and admin routes (coach session JWT). */
export async function getCoachAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not signed in");
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

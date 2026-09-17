import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentProfile(): Promise<{ userId: string; profile: Profile } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { userId: user.id, profile };
}

export async function requireProfile(): Promise<{ userId: string; profile: Profile }> {
  const result = await getCurrentProfile();
  if (!result) redirect("/login");
  return result;
}

export async function requireAdmin(): Promise<{ userId: string; profile: Profile }> {
  const result = await requireProfile();
  if (result.profile.role !== "admin") redirect("/inspecciones");
  return result;
}

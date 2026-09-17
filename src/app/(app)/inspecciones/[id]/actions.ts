"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function submitInspection(inspectionId: string) {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("inspections")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", inspectionId)
    .eq("supervisor_id", userId)
    .eq("status", "draft");

  if (error) throw new Error(error.message);

  revalidatePath(`/inspecciones/${inspectionId}`);
  revalidatePath("/inspecciones");
}

"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createInspection(formData: FormData) {
  const { userId } = await requireProfile();
  const branchId = formData.get("branch_id");

  if (typeof branchId !== "string" || !branchId) {
    throw new Error("Selecciona una sucursal");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspections")
    .insert({ branch_id: branchId, supervisor_id: userId, status: "draft" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la inspección");
  }

  redirect(`/inspecciones/${data.id}`);
}

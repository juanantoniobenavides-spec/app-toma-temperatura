"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createBranch(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();

  if (!name) throw new Error("El nombre es obligatorio");

  const { error } = await supabase.from("branches").insert({ name, address, city });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sucursales");
  redirect("/admin/sucursales");
}

export async function updateBranch(branchId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!name) throw new Error("El nombre es obligatorio");

  const { error } = await supabase
    .from("branches")
    .update({ name, address, city, active })
    .eq("id", branchId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sucursales");
  revalidatePath(`/admin/sucursales/${branchId}`);
}

export async function setBranchSupervisor(branchId: string, userId: string, assigned: boolean) {
  await requireAdmin();
  const supabase = await createClient();

  if (assigned) {
    const { error } = await supabase
      .from("branch_supervisors")
      .upsert({ branch_id: branchId, user_id: userId });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("branch_supervisors")
      .delete()
      .eq("branch_id", branchId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/admin/sucursales/${branchId}`);
}

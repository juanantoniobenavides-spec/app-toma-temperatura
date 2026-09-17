import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChecklistForm } from "@/components/ChecklistForm";

export default async function InspeccionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: inspection } = await supabase
    .from("inspections")
    .select("id, status, supervisor_id, branches(name)")
    .eq("id", id)
    .single();

  if (!inspection) notFound();
  if (profile.role !== "admin" && inspection.supervisor_id !== userId) notFound();

  const [{ data: sections }, { data: items }, { data: responses }] = await Promise.all([
    supabase.from("checklist_sections").select("*").eq("active", true).order("sort_order"),
    supabase.from("checklist_items").select("*").eq("active", true).order("sort_order"),
    supabase.from("inspection_responses").select("*").eq("inspection_id", id),
  ]);

  const editable = profile.role !== "admin" && inspection.status === "draft";

  return (
    <ChecklistForm
      inspectionId={inspection.id}
      branchName={(inspection as unknown as { branches: { name: string } | null }).branches?.name ?? "Sucursal"}
      status={inspection.status}
      sections={sections ?? []}
      items={items ?? []}
      initialResponses={responses ?? []}
      editable={editable}
      canResolve={profile.role === "admin"}
      currentUserId={userId}
    />
  );
}

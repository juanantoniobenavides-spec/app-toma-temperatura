import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChecklistForm } from "@/components/ChecklistForm";

export default async function ReporteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireAdmin();
  const supabase = await createClient();

  const { data: inspection } = await supabase
    .from("inspections")
    .select("id, status, branches(name), profiles!inspections_supervisor_id_fkey(full_name)")
    .eq("id", id)
    .single();

  if (!inspection) notFound();

  const [{ data: sections }, { data: items }, { data: responses }] = await Promise.all([
    supabase.from("checklist_sections").select("*").eq("active", true).order("sort_order"),
    supabase.from("checklist_items").select("*").eq("active", true).order("sort_order"),
    supabase.from("inspection_responses").select("*").eq("inspection_id", id),
  ]);

  const branchInfo = (inspection as unknown as { branches: { name: string } | null }).branches;
  const supervisorInfo = (
    inspection as unknown as { profiles: { full_name: string } | null }
  ).profiles;

  return (
    <div>
      <p className="mb-2 text-sm text-slate-500">
        Supervisor: {supervisorInfo?.full_name ?? "—"}
      </p>
      <ChecklistForm
        inspectionId={inspection.id}
        branchName={branchInfo?.name ?? "Sucursal"}
        status={inspection.status}
        sections={sections ?? []}
        items={items ?? []}
        initialResponses={responses ?? []}
        editable={false}
        canResolve={true}
        currentUserId={userId}
      />
    </div>
  );
}

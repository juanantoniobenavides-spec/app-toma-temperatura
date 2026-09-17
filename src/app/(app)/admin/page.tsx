import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: branches }, { data: inspections }, { data: openIssues }] = await Promise.all([
    supabase.from("branches").select("*").eq("active", true).order("name"),
    supabase
      .from("inspections")
      .select("id, branch_id, status, started_at, submitted_at")
      .order("started_at", { ascending: false }),
    supabase
      .from("inspection_responses")
      .select("id, inspections!inner(branch_id)")
      .eq("status", "problem")
      .eq("resolved", false),
  ]);

  const lastByBranch = new Map<string, { id: string; status: string; started_at: string }>();
  for (const insp of inspections ?? []) {
    if (!lastByBranch.has(insp.branch_id)) {
      lastByBranch.set(insp.branch_id, insp);
    }
  }

  const issuesByBranch = new Map<string, number>();
  for (const issue of openIssues ?? []) {
    const branchId = (issue as unknown as { inspections: { branch_id: string } }).inspections
      ?.branch_id;
    if (!branchId) continue;
    issuesByBranch.set(branchId, (issuesByBranch.get(branchId) ?? 0) + 1);
  }

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-50">
        Panel de sucursales
      </h1>

      {!branches || branches.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
          Aún no hay sucursales.{" "}
          <Link href="/admin/sucursales/nueva" className="text-blue-600 underline">
            Crea la primera
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {branches.map((branch) => {
            const last = lastByBranch.get(branch.id);
            const openCount = issuesByBranch.get(branch.id) ?? 0;
            return (
              <li key={branch.id}>
                <Link
                  href={`/admin/reportes?branch=${branch.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">{branch.name}</p>
                    <p className="text-xs text-slate-500">
                      {last
                        ? `Última visita: ${new Date(last.started_at).toLocaleDateString("es-CL")}`
                        : "Sin inspecciones registradas"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {openCount > 0 && (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        {openCount} pendiente{openCount === 1 ? "" : "s"}
                      </span>
                    )}
                    {last && <StatusBadge status={last.status as "draft" | "submitted"} />}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

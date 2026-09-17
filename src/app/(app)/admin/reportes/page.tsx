import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import type { InspectionStatus } from "@/types/database";

const VALID_STATUSES: InspectionStatus[] = ["draft", "submitted"];

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; status?: string }>;
}) {
  await requireAdmin();
  const { branch, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("inspections")
    .select("id, status, started_at, submitted_at, branches(id, name), profiles!inspections_supervisor_id_fkey(full_name)")
    .order("started_at", { ascending: false })
    .limit(100);

  if (branch) query = query.eq("branch_id", branch);
  if (status && VALID_STATUSES.includes(status as InspectionStatus)) {
    query = query.eq("status", status as InspectionStatus);
  }

  const [{ data: inspections }, { data: branches }] = await Promise.all([
    query,
    supabase.from("branches").select("id, name").order("name"),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-50">Reportes</h1>

      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <select
          name="branch"
          defaultValue={branch ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
        >
          <option value="">Todas las sucursales</option>
          {(branches ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="submitted">Enviado</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Filtrar
        </button>
      </form>

      {!inspections || inspections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
          No hay reportes para este filtro.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {inspections.map((insp) => {
            const branchInfo = (insp as unknown as { branches: { name: string } | null }).branches;
            const supervisorInfo = (
              insp as unknown as { profiles: { full_name: string } | null }
            ).profiles;
            return (
              <li key={insp.id}>
                <Link
                  href={`/admin/reportes/${insp.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">
                      {branchInfo?.name ?? "Sucursal"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {supervisorInfo?.full_name ?? "Supervisor"} ·{" "}
                      {new Date(insp.started_at).toLocaleString("es-CL")}
                    </p>
                  </div>
                  <StatusBadge status={insp.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";

export default async function InspeccionesPage() {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: inspections } = await supabase
    .from("inspections")
    .select("id, status, started_at, submitted_at, branches(name)")
    .eq("supervisor_id", userId)
    .order("started_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Mis inspecciones
        </h1>
        <Link
          href="/inspecciones/nueva"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nueva inspección
        </Link>
      </div>

      {!inspections || inspections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
          Aún no tienes inspecciones. Crea una nueva para comenzar el checklist de una sucursal.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {inspections.map((insp) => (
            <li key={insp.id}>
              <Link
                href={`/inspecciones/${insp.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-50">
                    {(insp as { branches: { name: string } | null }).branches?.name ?? "Sucursal"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(insp.started_at).toLocaleString("es-CL")}
                  </p>
                </div>
                <StatusBadge status={insp.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

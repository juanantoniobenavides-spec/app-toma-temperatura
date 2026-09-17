import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SucursalesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: branches } = await supabase.from("branches").select("*").order("name");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Sucursales</h1>
        <Link
          href="/admin/sucursales/nueva"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nueva sucursal
        </Link>
      </div>

      {!branches || branches.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
          Aún no hay sucursales registradas.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {branches.map((b) => (
            <li key={b.id}>
              <Link
                href={`/admin/sucursales/${b.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{b.name}</p>
                  <p className="text-xs text-slate-500">
                    {b.address} {b.city ? `· ${b.city}` : ""}
                  </p>
                </div>
                {!b.active && (
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Inactiva
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

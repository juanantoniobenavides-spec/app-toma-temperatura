import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateBranch } from "../actions";
import { SupervisorAssignment } from "@/components/SupervisorAssignment";

export default async function EditarSucursalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: branch }, { data: supervisors }, { data: assignments }] = await Promise.all([
    supabase.from("branches").select("*").eq("id", id).single(),
    supabase.from("profiles").select("*").eq("role", "supervisor").order("full_name"),
    supabase.from("branch_supervisors").select("user_id").eq("branch_id", id),
  ]);

  if (!branch) notFound();

  const updateBranchWithId = updateBranch.bind(null, id);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-50">
        Editar sucursal
      </h1>
      <form action={updateBranchWithId} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nombre
          </label>
          <input
            name="name"
            defaultValue={branch.name}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Dirección
          </label>
          <input
            name="address"
            defaultValue={branch.address}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Ciudad
          </label>
          <input
            name="city"
            defaultValue={branch.city}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" name="active" defaultChecked={branch.active} />
          Sucursal activa
        </label>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 py-2.5 text-base font-medium text-white hover:bg-blue-700"
        >
          Guardar cambios
        </button>
      </form>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Supervisores asignados
        </h2>
        <SupervisorAssignment
          branchId={branch.id}
          supervisors={supervisors ?? []}
          assignedIds={(assignments ?? []).map((a) => a.user_id)}
        />
      </div>
    </div>
  );
}

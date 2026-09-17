import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createInspection } from "./actions";

export default async function NuevaInspeccionPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const branches =
    profile.role === "admin"
      ? (await supabase.from("branches").select("id, name, city").eq("active", true).order("name")).data
      : (
          await supabase
            .from("branch_supervisors")
            .select("branches(id, name, city)")
            .eq("user_id", userId)
        ).data?.map((row) => (row as unknown as { branches: { id: string; name: string; city: string } }).branches) ?? [];

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-50">
        Nueva inspección
      </h1>

      {!branches || branches.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
          No tienes sucursales asignadas todavía. Pide a un administrador que te asigne una en el
          panel de Usuarios.
        </p>
      ) : (
        <form action={createInspection} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Sucursal
            </label>
            <select
              name="branch_id"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.city ? `– ${b.city}` : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 py-2.5 text-base font-medium text-white hover:bg-blue-700"
          >
            Comenzar checklist
          </button>
        </form>
      )}
    </div>
  );
}

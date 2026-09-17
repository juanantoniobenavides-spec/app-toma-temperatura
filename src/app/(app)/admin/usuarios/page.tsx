import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleSelect } from "@/components/RoleSelect";

export default async function UsuariosPage() {
  const { userId } = await requireAdmin();
  const supabase = await createClient();

  const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");

  return (
    <div>
      <h1 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-50">Usuarios</h1>
      <p className="mb-6 text-sm text-slate-500">
        Para crear un usuario nuevo, invítalo desde el panel de Supabase (Authentication →
        Users → Invite user). Aquí puedes asignarle un rol.
      </p>

      <ul className="flex flex-col gap-3">
        {(profiles ?? []).map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="font-medium text-slate-900 dark:text-slate-50">{p.full_name}</span>
            <RoleSelect userId={p.id} role={p.role} disabled={p.id === userId} />
          </li>
        ))}
      </ul>
    </div>
  );
}

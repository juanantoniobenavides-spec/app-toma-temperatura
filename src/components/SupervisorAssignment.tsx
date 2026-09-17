"use client";

import { useState, useTransition } from "react";
import { setBranchSupervisor } from "@/app/(app)/admin/sucursales/actions";
import type { Profile } from "@/types/database";

export function SupervisorAssignment({
  branchId,
  supervisors,
  assignedIds,
}: {
  branchId: string;
  supervisors: Profile[];
  assignedIds: string[];
}) {
  const [assigned, setAssigned] = useState(new Set(assignedIds));
  const [isPending, startTransition] = useTransition();

  function toggle(userId: string) {
    const next = new Set(assigned);
    const willAssign = !next.has(userId);
    if (willAssign) next.add(userId);
    else next.delete(userId);
    setAssigned(next);

    startTransition(async () => {
      await setBranchSupervisor(branchId, userId, willAssign);
    });
  }

  if (supervisors.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No hay supervisores registrados todavía. Invítalos desde Supabase y asígnales el rol en la
        sección Usuarios.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {supervisors.map((s) => (
        <li key={s.id}>
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
            <input
              type="checkbox"
              checked={assigned.has(s.id)}
              disabled={isPending}
              onChange={() => toggle(s.id)}
            />
            {s.full_name}
          </label>
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useTransition } from "react";
import { updateUserRole } from "@/app/(app)/admin/usuarios/actions";
import type { UserRole } from "@/types/database";

export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: UserRole;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={role}
      disabled={disabled || isPending}
      onChange={(e) =>
        startTransition(() => updateUserRole(userId, e.target.value as UserRole))
      }
      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
    >
      <option value="supervisor">Supervisor</option>
      <option value="admin">Administrador</option>
    </select>
  );
}

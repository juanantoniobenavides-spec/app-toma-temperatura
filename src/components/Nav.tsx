import Link from "next/link";
import { LogoutButton } from "./LogoutButton";
import type { Profile } from "@/types/database";

export function Nav({ profile }: { profile: Profile }) {
  const isAdmin = profile.role === "admin";

  const links = isAdmin
    ? [
        { href: "/admin", label: "Panel" },
        { href: "/admin/reportes", label: "Reportes" },
        { href: "/admin/sucursales", label: "Sucursales" },
        { href: "/admin/usuarios", label: "Usuarios" },
      ]
    : [
        { href: "/inspecciones", label: "Mis inspecciones" },
        { href: "/inspecciones/nueva", label: "Nueva inspección" },
      ];

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Supervisión de Locales
          </span>
          <nav className="hidden gap-4 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:inline">{profile.full_name}</span>
          <LogoutButton />
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-slate-100 px-4 py-2 sm:hidden dark:border-slate-900">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="shrink-0 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

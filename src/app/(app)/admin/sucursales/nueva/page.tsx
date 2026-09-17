import { requireAdmin } from "@/lib/auth";
import { createBranch } from "../actions";

export default async function NuevaSucursalPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-50">
        Nueva sucursal
      </h1>
      <form action={createBranch} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nombre
          </label>
          <input
            name="name"
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Ciudad
          </label>
          <input
            name="city"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 py-2.5 text-base font-medium text-white hover:bg-blue-700"
        >
          Crear sucursal
        </button>
      </form>
    </div>
  );
}

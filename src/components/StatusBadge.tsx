import type { InspectionStatus } from "@/types/database";

const STYLES: Record<InspectionStatus, string> = {
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  submitted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const LABELS: Record<InspectionStatus, string> = {
  draft: "Borrador",
  submitted: "Enviado",
};

export function StatusBadge({ status }: { status: InspectionStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}

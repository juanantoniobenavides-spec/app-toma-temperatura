"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { submitInspection } from "@/app/(app)/inspecciones/[id]/actions";
import type {
  ChecklistItem,
  ChecklistSection,
  InspectionResponse,
  InspectionStatus,
  ResponseStatus,
} from "@/types/database";

interface ResponseState {
  status: ResponseStatus | null;
  value: string;
  notes: string;
  photo_path: string | null;
  resolved: boolean;
  uploading: boolean;
}

function emptyResponse(): ResponseState {
  return { status: null, value: "", notes: "", photo_path: null, resolved: false, uploading: false };
}

function isProblem(item: ChecklistItem, r: ResponseState): boolean {
  if (item.item_type === "ok_problem") return r.status === "problem";
  if (item.item_type === "temperature") {
    if (r.value === "" || r.value === null) return false;
    const num = Number(r.value);
    if (Number.isNaN(num)) return false;
    if (item.min_value !== null && num < item.min_value) return true;
    if (item.max_value !== null && num > item.max_value) return true;
    return false;
  }
  return false;
}

export function ChecklistForm({
  inspectionId,
  branchName,
  status,
  sections,
  items,
  initialResponses,
  editable,
  canResolve,
  currentUserId,
}: {
  inspectionId: string;
  branchName: string;
  status: InspectionStatus;
  sections: ChecklistSection[];
  items: ChecklistItem[];
  initialResponses: InspectionResponse[];
  editable: boolean;
  canResolve: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(status === "submitted");

  const [responses, setResponses] = useState<Record<string, ResponseState>>(() => {
    const map: Record<string, ResponseState> = {};
    for (const item of items) {
      const existing = initialResponses.find((r) => r.checklist_item_id === item.id);
      map[item.id] = existing
        ? {
            status: existing.status,
            value: existing.value === null ? "" : String(existing.value),
            notes: existing.notes,
            photo_path: existing.photo_path,
            resolved: existing.resolved,
            uploading: false,
          }
        : emptyResponse();
    }
    return map;
  });

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const itemsBySection = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of items) {
      if (!map.has(item.section_id)) map.set(item.section_id, []);
      map.get(item.section_id)!.push(item);
    }
    return map;
  }, [items]);

  async function persist(itemId: string, r: ResponseState) {
    const item = items.find((i) => i.id === itemId);
    let status = r.status;

    if (item?.item_type === "temperature") {
      if (r.value === "") {
        status = null;
      } else {
        const num = Number(r.value);
        const outOfRange =
          !Number.isNaN(num) &&
          ((item.min_value !== null && num < item.min_value) ||
            (item.max_value !== null && num > item.max_value));
        status = outOfRange ? "problem" : "ok";
      }
    }

    await supabase.from("inspection_responses").upsert(
      {
        inspection_id: inspectionId,
        checklist_item_id: itemId,
        status,
        value: r.value === "" ? null : Number(r.value),
        notes: r.notes,
        photo_path: r.photo_path,
      },
      { onConflict: "inspection_id,checklist_item_id" }
    );
  }

  function update(itemId: string, patch: Partial<ResponseState>, debounceMs = 0) {
    setResponses((prev) => {
      const next = { ...prev, [itemId]: { ...prev[itemId], ...patch } };

      if (debounceMs > 0) {
        clearTimeout(timers.current[itemId]);
        timers.current[itemId] = setTimeout(() => persist(itemId, next[itemId]), debounceMs);
      } else {
        persist(itemId, next[itemId]);
      }

      return next;
    });
  }

  async function handlePhoto(item: ChecklistItem, file: File) {
    update(item.id, { uploading: true });
    // eslint-disable-next-line react-hooks/purity -- runs only inside a file-input change handler, never during render
    const path = `${inspectionId}/${item.id}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("inspection-photos").upload(path, file, {
      contentType: file.type || "image/jpeg",
    });
    if (!error) {
      update(item.id, { photo_path: path, uploading: false });
    } else {
      update(item.id, { uploading: false });
    }
  }

  async function toggleResolved(item: ChecklistItem) {
    const r = responses[item.id];
    const resolved = !r.resolved;
    setResponses((prev) => ({ ...prev, [item.id]: { ...prev[item.id], resolved } }));
    await supabase
      .from("inspection_responses")
      .update({
        resolved,
        resolved_at: resolved ? new Date().toISOString() : null,
        resolved_by: resolved ? currentUserId : null,
      })
      .eq("inspection_id", inspectionId)
      .eq("checklist_item_id", item.id);
  }

  function photoUrl(path: string) {
    return supabase.storage.from("inspection-photos").getPublicUrl(path).data.publicUrl;
  }

  const pendingCount = items.filter((item) => {
    if (item.item_type === "text") return false;
    return responses[item.id]?.status === null && responses[item.id]?.value === "";
  }).length;

  const problemCount = items.filter((item) => isProblem(item, responses[item.id])).length;

  async function handleSubmit() {
    startTransition(async () => {
      await submitInspection(inspectionId);
      setSubmitted(true);
      router.refresh();
    });
  }

  return (
    <div className="pb-24">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{branchName}</h1>
        <p className="text-sm text-slate-500">
          {submitted ? "Informe enviado" : `${pendingCount} ítems pendientes · ${problemCount} con problemas`}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {sections.map((section) => {
          const sectionItems = itemsBySection.get(section.id) ?? [];
          if (sectionItems.length === 0) return null;
          return (
            <section
              key={section.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {section.name}
              </h2>
              <div className="flex flex-col gap-4">
                {sectionItems.map((item) => {
                  const r = responses[item.id];
                  const problem = isProblem(item, r);
                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-3 ${
                        problem
                          ? r.resolved
                            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                            : "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                          : "border-slate-100 dark:border-slate-800"
                      }`}
                    >
                      <p className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                        {item.label}
                      </p>

                      {item.item_type === "ok_problem" && (
                        <div className="flex gap-2">
                          {(["ok", "problem", "na"] as ResponseStatus[]).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              disabled={!editable}
                              onClick={() => update(item.id, { status: opt })}
                              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition disabled:opacity-60 ${
                                r.status === opt
                                  ? opt === "problem"
                                    ? "border-red-500 bg-red-500 text-white"
                                    : opt === "ok"
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : "border-slate-400 bg-slate-400 text-white"
                                  : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {opt === "ok" ? "OK" : opt === "problem" ? "Problema" : "N/A"}
                            </button>
                          ))}
                        </div>
                      )}

                      {item.item_type === "temperature" && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            inputMode="decimal"
                            disabled={!editable}
                            value={r.value}
                            onChange={(e) => update(item.id, { value: e.target.value }, 500)}
                            placeholder="--"
                            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                          />
                          <span className="text-sm text-slate-500">{item.unit}</span>
                          {item.min_value !== null && item.max_value !== null && (
                            <span className="text-xs text-slate-400">
                              (rango: {item.min_value} a {item.max_value} {item.unit})
                            </span>
                          )}
                          {problem && (
                            <span className="ml-auto text-xs font-medium text-red-600">
                              Fuera de rango
                            </span>
                          )}
                        </div>
                      )}

                      {item.item_type === "text" && (
                        <textarea
                          disabled={!editable}
                          value={r.notes}
                          onChange={(e) => update(item.id, { notes: e.target.value }, 600)}
                          rows={2}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                          placeholder="Escribe una observación..."
                        />
                      )}

                      {item.item_type !== "text" && problem && (
                        <div className="mt-3 flex flex-col gap-2">
                          <textarea
                            disabled={!editable}
                            value={r.notes}
                            onChange={(e) => update(item.id, { notes: e.target.value }, 600)}
                            rows={2}
                            placeholder="Describe el problema..."
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                          />
                          <div className="flex flex-wrap items-center gap-3">
                            {editable && (
                              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                {r.uploading ? "Subiendo..." : r.photo_path ? "Cambiar foto" : "Agregar foto"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handlePhoto(item, file);
                                  }}
                                />
                              </label>
                            )}
                            {r.photo_path && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={photoUrl(r.photo_path)}
                                alt="Evidencia"
                                className="h-16 w-16 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                              />
                            )}
                            {canResolve && (
                              <label className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={r.resolved}
                                  onChange={() => toggleResolved(item)}
                                />
                                Resuelto
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {editable && !submitted && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              {pendingCount > 0 ? `${pendingCount} ítems sin revisar` : "Checklist completo"}
            </p>
            <button
              type="button"
              disabled={isPending}
              onClick={handleSubmit}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isPending ? "Enviando..." : "Enviar informe"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

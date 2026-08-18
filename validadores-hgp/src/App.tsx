import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Ambulance,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Hospital,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { demoEgresos, demoEmergencia } from "./data/demo";
import { downloadTemplate, exportErrorsCsv, exportErrorsExcel } from "./lib/exportErrors";
import { loadDataset } from "./lib/parseFile";
import { computeQualityScore } from "./lib/qualityScore";
import { loadReviewed, removeReviewed, upsertReviewed } from "./lib/reviewedStore";
import {
  DIMENSION_LABELS,
  FIELD_LABELS,
  type Dataset,
  type Issue,
  type QualityScore,
  type ReviewedEntry,
  type ValidatorKind,
} from "./types";

type FilterId = "pendientes" | "revisados" | "errores" | "advertencias" | "todos";

const KIND_META: Record<
  ValidatorKind,
  { title: string; subtitle: string; icon: typeof Hospital }
> = {
  egresos: {
    title: "Egresos hospitalarios",
    subtitle: "Altas, diagnósticos CIE-10, estada y condición de egreso",
    icon: Hospital,
  },
  emergencia: {
    title: "Emergencia",
    subtitle: "Triage, tiempos de atención, destino y condición de salida",
    icon: Ambulance,
  },
};

function scoreTone(label: QualityScore["label"]) {
  if (label === "Excelente") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (label === "Bueno") return "bg-teal-50 text-teal-800 border-teal-200";
  if (label === "Regular") return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-rose-50 text-rose-800 border-rose-200";
}

function ScoreCard({ score }: { score: QualityScore }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <article className={`rounded-2xl border p-5 ${scoreTone(score.label)}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wide">Puntaje de calidad</p>
        <p className="mt-2 font-display text-5xl font-bold leading-none">{score.overall}</p>
        <p className="mt-2 text-sm font-semibold">{score.label}</p>
        <p className="mt-3 text-[11px] leading-5 opacity-80">
          {score.cleanRows} filas limpias de {score.totalRows} · {score.pendingRows} pendientes
        </p>
      </article>
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(DIMENSION_LABELS) as Array<keyof typeof DIMENSION_LABELS>).map((key) => (
          <article key={key} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
              <span>{DIMENSION_LABELS[key]}</span>
              <span className="text-ink">{score.dimensions[key]}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-teal"
                style={{ width: `${score.dimensions[key]}%` }}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function IssueList({ issues }: { issues: Issue[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {issues.map((item) => (
        <li
          key={item.id}
          className={`rounded-xl px-3 py-2 text-[11px] leading-5 ${
            item.severity === "error"
              ? "bg-rose-50 text-rose-900"
              : "bg-amber-50 text-amber-900"
          }`}
        >
          <span className="font-bold">{item.code}</span>
          {" · "}
          {FIELD_LABELS[item.field] ?? item.field}
          {" · "}
          {item.message}
          {item.value ? ` · valor: ${item.value}` : ""}
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  const [kind, setKind] = useState<ValidatorKind>("egresos");
  const [sessions, setSessions] = useState<Record<ValidatorKind, Dataset | null>>({
    egresos: null,
    emergencia: null,
  });
  const [reviewed, setReviewed] = useState<Map<string, ReviewedEntry>>(() => {
    const map = new Map<string, ReviewedEntry>();
    loadReviewed("egresos").forEach((value, key) => map.set(key, value));
    loadReviewed("emergencia").forEach((value, key) => map.set(key, value));
    return map;
  });
  const [filter, setFilter] = useState<FilterId>("pendientes");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dataset = sessions[kind];
  const score = useMemo(
    () =>
      dataset
        ? computeQualityScore(dataset.rows, dataset.issues, new Set(reviewed.keys()))
        : null,
    [dataset, reviewed],
  );

  const issuesByRow = useMemo(() => {
    const map = new Map<string, Issue[]>();
    dataset?.issues.forEach((item) => {
      const list = map.get(item.rowKey) ?? [];
      list.push(item);
      map.set(item.rowKey, list);
    });
    return map;
  }, [dataset]);

  const visibleRows = useMemo(() => {
    if (!dataset) return [];
    const needle = query.trim().toLowerCase();
    return dataset.rows.filter((row) => {
      const issues = issuesByRow.get(row.rowKey) ?? [];
      const isReviewed = reviewed.has(row.rowKey);
      const hasError = issues.some((item) => item.severity === "error");
      const hasWarning = issues.some((item) => item.severity === "warning");
      if (filter === "pendientes" && (isReviewed || issues.length === 0)) return false;
      if (filter === "revisados" && !isReviewed) return false;
      if (filter === "errores" && !hasError) return false;
      if (filter === "advertencias" && (hasError || !hasWarning)) return false;
      if (!needle) return true;
      const blob = [
        row.values.historiaClinica,
        row.values.apellidosNombres,
        row.values.cedula,
        ...issues.map((item) => `${item.code} ${item.message}`),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [dataset, filter, issuesByRow, query, reviewed]);

  function setSession(next: Dataset) {
    setSessions((current) => ({ ...current, [next.kind]: next }));
    setSelected(new Set());
    setFilter("pendientes");
    setFeedback(
      `Se validaron ${next.rows.length} registros · ${next.issues.length} hallazgos.`,
    );
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      setSession(await loadDataset(kind, file));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo leer el archivo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function markRows(keys: string[], reviewedFlag: boolean) {
    const next = new Map(reviewed);
    keys.forEach((key) => {
      if (reviewedFlag) {
        const entry: ReviewedEntry = {
          rowKey: key,
          reviewedAt: new Date().toISOString(),
          note: note.trim(),
        };
        next.set(key, entry);
        upsertReviewed(entry);
      } else {
        next.delete(key);
        removeReviewed(key);
      }
    });
    setReviewed(next);
    setSelected(new Set());
    setNote("");
    setFeedback(
      reviewedFlag
        ? `Se marcaron ${keys.length} fila(s) como revisadas.`
        : `Se quitó la marca de revisión de ${keys.length} fila(s).`,
    );
  }

  const meta = KIND_META[kind];
  const Icon = meta.icon;

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-navy text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-white/10">
              <ShieldCheck size={22} className="text-teal-soft" />
            </span>
            <div>
              <p className="font-display text-lg leading-tight">Hospital General Puyo</p>
              <p className="text-xs text-white/70">
                Validadores independientes · calidad de datos · MSP Ecuador
              </p>
            </div>
          </div>
          <div className="flex rounded-xl bg-white/10 p-1">
            {(["egresos", "emergencia"] as ValidatorKind[]).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setKind(item);
                  setSelected(new Set());
                  setFeedback("");
                }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  kind === item ? "bg-white text-navy" : "text-white/80"
                }`}
              >
                {KIND_META[item].title}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal">
              Validador {kind}
            </p>
            <h1 className="mt-1 flex items-center gap-2 font-display text-3xl text-navy">
              <Icon size={28} /> {meta.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{meta.subtitle}</p>
          </div>
          <button
            onClick={() => downloadTemplate(kind)}
            className="flex w-fit items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-navy"
          >
            <Download size={15} /> Plantilla Excel
          </button>
        </div>

        <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <label className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-teal/40 bg-sand/60 px-4 py-8 text-center">
              <Upload className="text-teal" size={22} />
              <span className="mt-2 text-sm font-semibold text-navy">
                Cargar Excel o CSV
              </span>
              <span className="mt-1 text-[11px] text-muted">
                El archivo no sale de este equipo. Encabezados en español.
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                className="sr-only"
                onChange={(event) => onFile(event.target.files?.[0])}
              />
            </label>
            <button
              disabled={busy}
              onClick={() => setSession(kind === "egresos" ? demoEgresos() : demoEmergencia())}
              className="rounded-2xl bg-navy px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Usar datos de demostración
            </button>
          </div>
          {feedback && (
            <p className="mt-4 rounded-xl bg-sand px-3 py-2 text-[11px] text-navy">{feedback}</p>
          )}
        </section>

        {!dataset && (
          <section className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Exportar errores", "Excel y CSV con fila, código, mensaje y estado de revisión"],
              ["Marcar revisadas", "Las filas quedan registradas en este navegador con nota"],
              ["Puntaje de calidad", "Completitud, validez, consistencia y unicidad"],
            ].map(([title, detail]) => (
              <article key={title} className="rounded-2xl border border-line bg-white p-5">
                <ClipboardCheck className="text-teal" size={18} />
                <p className="mt-3 text-sm font-bold text-navy">{title}</p>
                <p className="mt-1 text-[11px] leading-5 text-muted">{detail}</p>
              </article>
            ))}
          </section>
        )}

        {dataset && score && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                <FileSpreadsheet size={13} className="mr-1 inline" />
                {dataset.fileName} · {dataset.rows.length} registros
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => exportErrorsExcel(dataset, score, reviewed)}
                  className="flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-xs font-semibold text-white"
                >
                  <Download size={14} /> Exportar errores Excel
                </button>
                <button
                  onClick={() => exportErrorsCsv(dataset, reviewed)}
                  className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-navy"
                >
                  <Download size={14} /> Exportar CSV
                </button>
              </div>
            </div>

            <ScoreCard score={score} />

            <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center">
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ["pendientes", "Pendientes"],
                      ["revisados", "Revisadas"],
                      ["errores", "Errores"],
                      ["advertencias", "Advertencias"],
                      ["todos", "Todas"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setFilter(id)}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold ${
                        filter === id ? "bg-navy text-white" : "bg-sand text-navy"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-muted" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar historia, paciente o código"
                    className="h-9 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-xs"
                  />
                </label>
              </div>

              {selected.size > 0 && (
                <div className="flex flex-col gap-3 border-b border-line bg-sand/70 px-4 py-3 sm:flex-row sm:items-center">
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Nota de revisión (opcional)"
                    className="h-9 flex-1 rounded-xl border border-line bg-white px-3 text-xs"
                  />
                  <button
                    onClick={() => markRows([...selected], true)}
                    className="rounded-xl bg-navy px-3 py-2 text-[11px] font-semibold text-white"
                  >
                    Marcar {selected.size} como revisadas
                  </button>
                  <button
                    onClick={() => markRows([...selected], false)}
                    className="rounded-xl border border-line bg-white px-3 py-2 text-[11px] font-semibold"
                  >
                    Quitar revisión
                  </button>
                </div>
              )}

              {visibleRows.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted">
                  <CheckCircle2 className="mx-auto text-teal" size={28} />
                  <p className="mt-3 font-semibold text-navy">No hay filas en este filtro</p>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {visibleRows.map((row) => {
                    const issues = issuesByRow.get(row.rowKey) ?? [];
                    const isReviewed = reviewed.has(row.rowKey);
                    const checked = selected.has(row.rowKey);
                    return (
                      <article key={row.rowKey} className="px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <label className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = new Set(selected);
                                if (next.has(row.rowKey)) next.delete(row.rowKey);
                                else next.add(row.rowKey);
                                setSelected(next);
                              }}
                            />
                            Fila {row.rowNumber}
                          </label>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-navy">
                                {row.values.apellidosNombres || "Sin nombre"}
                              </p>
                              <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold text-muted">
                                HC {row.values.historiaClinica || "—"}
                              </span>
                              {isReviewed && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  Revisada
                                </span>
                              )}
                              {issues.length === 0 && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  Sin hallazgos
                                </span>
                              )}
                            </div>
                            {issues.length > 0 ? (
                              <IssueList issues={issues} />
                            ) : (
                              <p className="mt-2 text-[11px] text-muted">Registro válido.</p>
                            )}
                            {isReviewed && reviewed.get(row.rowKey)?.note && (
                              <p className="mt-2 text-[11px] text-teal">
                                Nota: {reviewed.get(row.rowKey)?.note}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => markRows([row.rowKey], !isReviewed)}
                            className="w-fit rounded-xl border border-line px-3 py-2 text-[11px] font-semibold text-navy"
                          >
                            {isReviewed ? "Quitar revisión" : "Marcar revisada"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <p className="flex items-start gap-2 text-[11px] leading-5 text-muted">
              <BarChart3 size={14} className="mt-0.5 shrink-0" />
              El puntaje no cambia al marcar revisadas: la calidad mide el archivo de origen.
              Las marcas sirven para el trabajo de estadística y salen en la exportación.
            </p>
            <p className="flex items-start gap-2 text-[11px] leading-5 text-muted">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Herramienta local e independiente de NeuroSys y del sistema de horarios. No envía
              datos a un servidor.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

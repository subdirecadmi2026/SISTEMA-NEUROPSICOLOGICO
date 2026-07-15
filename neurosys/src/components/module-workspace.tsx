"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  FilePlus2,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  advanceOperationalRecord,
  createOperationalRecord,
  registerInvoicePayment,
  type OperationalKind,
  type OperationalOptions,
  type OperationalRow,
} from "@/app/operational-actions";

type ModuleConfig = {
  eyebrow: string;
  title: string;
  description: string;
  createLabel: string;
  emptyLabel: string;
  actionLabel: string;
};

const configs: Record<OperationalKind, ModuleConfig> = {
  evaluations: {
    eyebrow: "Proceso neuropsicológico",
    title: "Evaluaciones",
    description: "Protocolos, interpretación clínica y autorización de resultados.",
    createLabel: "Nueva evaluación",
    emptyLabel: "No hay evaluaciones registradas",
    actionLabel: "Completar",
  },
  therapies: {
    eyebrow: "Intervención clínica",
    title: "Planes terapéuticos",
    description: "Objetivos, progreso y cierre de planes de intervención.",
    createLabel: "Nuevo plan",
    emptyLabel: "No hay planes terapéuticos",
    actionLabel: "Completar plan",
  },
  reports: {
    eyebrow: "Documentación clínica",
    title: "Informes",
    description: "Redacción, firma y trazabilidad de documentos clínicos.",
    createLabel: "Nuevo informe",
    emptyLabel: "No hay informes registrados",
    actionLabel: "Firmar",
  },
  communications: {
    eyebrow: "Contacto autorizado",
    title: "Comunicaciones",
    description: "Recordatorios y contactos registrados con consentimiento.",
    createLabel: "Nueva comunicación",
    emptyLabel: "No hay comunicaciones registradas",
    actionLabel: "Marcar enviada",
  },
  billing: {
    eyebrow: "Gestión financiera",
    title: "Caja y facturación",
    description: "Comprobantes internos, saldos y registro de pagos.",
    createLabel: "Nueva factura",
    emptyLabel: "No hay facturas registradas",
    actionLabel: "Registrar pago",
  },
};

const statusLabels: Record<string, string> = {
  in_progress: "En proceso",
  completed: "Completado",
  authorized: "Autorizado",
  active: "Activo",
  paused: "Pausado",
  draft: "Borrador",
  signed: "Firmado",
  delivered: "Entregado",
  scheduled: "Programado",
  sent: "Enviado",
  failed: "Fallido",
  cancelled: "Cancelado",
  issued: "Emitida",
  partially_paid: "Pago parcial",
  paid: "Pagada",
  voided: "Anulado",
};

const completedStatuses = new Set([
  "completed",
  "authorized",
  "signed",
  "delivered",
  "sent",
  "paid",
  "voided",
  "cancelled",
  "failed",
]);

function Field({
  label,
  name,
  type = "text",
  required = true,
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
  step?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs outline-none focus:border-indigo-400"
        {...props}
      />
    </label>
  );
}

function RecordForm({
  kind,
  options,
  close,
}: {
  kind: OperationalKind;
  options: OperationalOptions;
  close: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const result = await createOperationalRecord(
      kind,
      new FormData(event.currentTarget),
    );
    setSubmitting(false);
    setFeedback(result.message);
    if (result.ok) {
      close();
      router.refresh();
    }
  }

  return (
    <form className="grid gap-4 p-6 sm:grid-cols-2" onSubmit={submit}>
      <label className="space-y-2 sm:col-span-2">
        <span className="text-[11px] font-semibold text-slate-600">Paciente</span>
        <select
          name="patientId"
          required
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs"
        >
          {options.patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name}
            </option>
          ))}
        </select>
      </label>

      {kind === "evaluations" && (
        <>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Tipo de evaluación
            </span>
            <select
              name="evaluationType"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs"
            >
              <option>Evaluación neuropsicológica inicial</option>
              <option>Reevaluación de funciones ejecutivas</option>
              <option>Evaluación del neurodesarrollo</option>
              <option>Evaluación cognitiva</option>
            </select>
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Síntesis clínica inicial
            </span>
            <textarea
              name="summary"
              rows={4}
              maxLength={8000}
              className="w-full rounded-xl border border-slate-200 p-3.5 text-xs"
            />
          </label>
        </>
      )}

      {kind === "therapies" && (
        <>
          <Field label="Nombre del plan" name="title" placeholder="Plan de intervención cognitiva" />
          <Field label="Fecha de inicio" name="startedOn" type="date" required={false} />
          <label className="space-y-2 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Objetivos terapéuticos
            </span>
            <textarea
              name="objectives"
              required
              rows={5}
              maxLength={8000}
              placeholder="Describe objetivos observables y medibles..."
              className="w-full rounded-xl border border-slate-200 p-3.5 text-xs"
            />
          </label>
        </>
      )}

      {kind === "reports" && (
        <>
          <Field label="Tipo de informe" name="reportType" placeholder="Informe neuropsicológico" />
          <Field label="Título" name="title" placeholder="Resultados y recomendaciones" />
          <label className="space-y-2 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Contenido clínico
            </span>
            <textarea
              name="content"
              required
              rows={8}
              minLength={10}
              maxLength={30000}
              className="w-full rounded-xl border border-slate-200 p-3.5 text-xs"
            />
          </label>
        </>
      )}

      {kind === "communications" && (
        <>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Canal</span>
            <select name="channel" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs">
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Correo</option>
              <option value="sms">SMS</option>
              <option value="phone_call">Llamada</option>
              <option value="in_person">Presencial</option>
            </select>
          </label>
          <Field label="Destinatario" name="recipient" placeholder="Teléfono o correo autorizado" />
          <Field label="Asunto" name="subject" required={false} placeholder="Recordatorio de cita" />
          <label className="space-y-2 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-600">Mensaje</span>
            <textarea name="body" required rows={5} maxLength={4000} className="w-full rounded-xl border border-slate-200 p-3.5 text-xs" />
          </label>
          <label className="flex items-center gap-2 text-[10px] text-slate-600 sm:col-span-2">
            <input name="consentVerified" type="checkbox" required className="accent-indigo-600" />
            Verifiqué el consentimiento para contactar al paciente o representante.
          </label>
        </>
      )}

      {kind === "billing" && (
        <>
          <Field label="Concepto" name="description" placeholder="Evaluación neuropsicológica" />
          <Field label="Vencimiento" name="dueOn" type="date" required={false} />
          <Field label="Subtotal" name="amount" type="number" min="0.01" step="0.01" />
          <Field label="Impuestos" name="taxAmount" type="number" min="0" step="0.01" />
          <p className="text-[10px] leading-5 text-slate-400 sm:col-span-2">
            Comprobante interno. La facturación electrónica SRI requiere una
            integración fiscal independiente.
          </p>
        </>
      )}

      {feedback && (
        <p role="status" className="rounded-xl bg-amber-50 p-3 text-[10px] text-amber-800 sm:col-span-2">
          {feedback}
        </p>
      )}
      <div className="flex justify-end gap-3 sm:col-span-2">
        <button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || options.patients.length === 0}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Guardando..." : "Guardar registro"}
        </button>
      </div>
    </form>
  );
}

function PaymentForm({
  row,
  close,
}: {
  row: OperationalRow;
  close: () => void;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [operationKey] = useState(() => crypto.randomUUID());
  const balance = Math.max(0, (row.amount ?? 0) - (row.paid ?? 0));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const result = await registerInvoicePayment(
      row.id,
      new FormData(event.currentTarget),
    );
    setSubmitting(false);
    setFeedback(result.message);
    if (result.ok) {
      close();
      router.refresh();
    }
  }

  return (
    <form className="grid gap-4 p-6 sm:grid-cols-2" onSubmit={submit}>
      <input type="hidden" name="operationKey" value={operationKey} />
      <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
        <p className="text-[10px] text-slate-500">Saldo pendiente</p>
        <p className="mt-1 text-xl font-bold text-slate-900">${balance.toFixed(2)}</p>
      </div>
      <Field label="Valor recibido" name="amount" type="number" min="0.01" step="0.01" />
      <label className="space-y-2">
        <span className="text-[11px] font-semibold text-slate-600">Método</span>
        <select name="method" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs">
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
          <option value="other">Otro</option>
        </select>
      </label>
      <label className="space-y-2 sm:col-span-2">
        <span className="text-[11px] font-semibold text-slate-600">Referencia</span>
        <input name="reference" maxLength={180} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs" />
      </label>
      {feedback && <p className="text-[10px] text-amber-700 sm:col-span-2">{feedback}</p>}
      <div className="flex justify-end gap-3 sm:col-span-2">
        <button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold">Cancelar</button>
        <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
          {submitting ? "Registrando..." : "Registrar pago"}
        </button>
      </div>
    </form>
  );
}

export function ModuleWorkspace({
  kind,
  rows,
  options,
  connected,
}: {
  kind: OperationalKind;
  rows: OperationalRow[];
  options: OperationalOptions;
  connected: boolean;
}) {
  const router = useRouter();
  const config = configs[kind];
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<OperationalRow | null>(null);
  const [busyId, setBusyId] = useState("");
  const [feedback, setFeedback] = useState("");
  const completed = rows.filter((row) => completedStatuses.has(row.status)).length;

  async function advance(row: OperationalRow) {
    if (kind === "billing") {
      setPaying(row);
      return;
    }
    setBusyId(row.id);
    const result = await advanceOperationalRecord(kind, row.id);
    setFeedback(result.message);
    setBusyId("");
    if (result.ok) router.refresh();
  }

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-7 lg:px-9">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium text-indigo-600">{config.eyebrow}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{config.title}</h1>
            <p className="mt-2 text-xs text-slate-500">{config.description}</p>
            <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              <ShieldCheck size={11} />
              {connected ? "Datos protegidos por sede" : "Modo demostrativo"}
            </span>
          </div>
          <button onClick={() => setCreating(true)} className="flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-200">
            <Plus size={16} /> {config.createLabel}
          </button>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            ["Registros", rows.length],
            ["Finalizados", completed],
            ["En proceso", rows.length - completed],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5">
              <p className="text-xl font-bold text-slate-950">{value}</p>
              <p className="mt-1 text-[10px] text-slate-500">{label}</p>
            </article>
          ))}
        </div>

        {feedback && <p className="mt-4 rounded-xl bg-indigo-50 p-3 text-[10px] text-indigo-700">{feedback}</p>}

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {rows.length === 0 ? (
            <div className="p-14 text-center">
              <FilePlus2 className="mx-auto text-slate-300" size={28} />
              <p className="mt-3 text-sm font-semibold text-slate-700">{config.emptyLabel}</p>
              <p className="mt-1 text-xs text-slate-400">Crea el primer registro para comenzar.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map((row) => {
                const done = completedStatuses.has(row.status);
                return (
                  <article key={row.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${done ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>
                      {kind === "billing" ? <CircleDollarSign size={18} /> : <CheckCircle2 size={18} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800">{row.title}</p>
                      <p className="mt-1 truncate text-[10px] text-slate-500">{row.patient} · {row.detail}</p>
                      {kind === "billing" && (
                        <p className="mt-1 text-[10px] font-semibold text-emerald-700">
                          ${(row.paid ?? 0).toFixed(2)} pagado de ${(row.amount ?? 0).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-bold ${done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {statusLabels[row.status] ?? row.status}
                    </span>
                    {!done && (
                      <button
                        onClick={() => advance(row)}
                        disabled={busyId === row.id}
                        className="flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-indigo-600 disabled:opacity-50"
                      >
                        {config.actionLabel} <ArrowRight size={12} />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {(creating || paying) && (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
          <button aria-label="Cerrar" className="absolute inset-0 cursor-default" onClick={() => { setCreating(false); setPaying(null); }} />
          <section className="relative my-6 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {paying ? "Registrar pago" : config.createLabel}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {paying ? paying.title : "Completa los datos del nuevo registro."}
                </p>
              </div>
              <button aria-label="Cerrar" onClick={() => { setCreating(false); setPaying(null); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            {paying ? (
              <PaymentForm row={paying} close={() => setPaying(null)} />
            ) : (
              <RecordForm kind={kind} options={options} close={() => setCreating(false)} />
            )}
          </section>
        </div>
      )}
    </>
  );
}

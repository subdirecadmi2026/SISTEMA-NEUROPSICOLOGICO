"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type OperationalKind =
  | "evaluations"
  | "therapies"
  | "reports"
  | "communications"
  | "billing";

export type OperationalRow = {
  id: string;
  patient: string;
  title: string;
  detail: string;
  status: string;
  createdAt: string;
  amount?: number;
  paid?: number;
};

export type OperationalOptions = {
  branchId: string;
  patients: {
    id: string;
    name: string;
    phone: string;
    email: string;
  }[];
};

export type OperationalResult = {
  ok: boolean;
  message: string;
};

const schemas = {
  evaluations: z.object({
    patientId: z.uuid(),
    evaluationType: z.string().trim().min(2).max(160),
    summary: z.string().trim().max(8000).optional().or(z.literal("")),
  }),
  therapies: z.object({
    patientId: z.uuid(),
    title: z.string().trim().min(2).max(160),
    objectives: z.string().trim().min(2).max(8000),
    startedOn: z.iso.date().optional().or(z.literal("")),
  }),
  reports: z.object({
    patientId: z.uuid(),
    reportType: z.string().trim().min(2).max(160),
    title: z.string().trim().min(2).max(180),
    content: z.string().trim().min(10).max(30000),
  }),
  communications: z.object({
    patientId: z.uuid(),
    channel: z.enum(["email", "sms", "whatsapp", "phone_call", "in_person"]),
    recipient: z.string().trim().min(3).max(180),
    subject: z.string().trim().max(180).optional().or(z.literal("")),
    body: z.string().trim().min(2).max(4000),
    consentVerified: z.literal("on"),
  }),
  billing: z.object({
    patientId: z.uuid(),
    description: z.string().trim().min(2).max(500),
    amount: z.coerce.number().positive().max(9999999),
    taxAmount: z.coerce.number().min(0).max(9999999),
    dueOn: z.iso.date().optional().or(z.literal("")),
  }),
};

const paths: Record<OperationalKind, string> = {
  evaluations: "/evaluaciones",
  therapies: "/terapias",
  reports: "/informes",
  communications: "/comunicaciones",
  billing: "/facturacion",
};

async function getSessionContext() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, branch_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .not("branch_id", "is", null)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!membership?.branch_id) return null;
  return { supabase, user, membership };
}

function patientName(
  value:
    | { first_names: string; last_names: string }
    | { first_names: string; last_names: string }[]
    | null,
) {
  const patient = Array.isArray(value) ? value[0] : value;
  return patient
    ? `${patient.first_names} ${patient.last_names}`.trim()
    : "Paciente";
}

export async function getOperationalOptions(): Promise<OperationalOptions | null> {
  const context = await getSessionContext();
  if (!context) return null;
  const { data, error } = await context.supabase
    .from("patients")
    .select("id, first_names, last_names, phone, email")
    .eq("organization_id", context.membership.organization_id)
    .eq("branch_id", context.membership.branch_id)
    .is("deleted_at", null)
    .order("last_names")
    .limit(300);
  if (error) throw new Error("No fue posible cargar los pacientes de la sede.");

  return {
    branchId: context.membership.branch_id,
    patients: (data ?? []).map((patient) => ({
      id: patient.id,
      name: `${patient.first_names} ${patient.last_names}`,
      phone: patient.phone ?? "",
      email: patient.email ?? "",
    })),
  };
}

export async function listOperationalRecords(
  kind: OperationalKind,
): Promise<OperationalRow[] | null> {
  const context = await getSessionContext();
  if (!context) return null;
  const branchId = context.membership.branch_id;

  if (kind === "evaluations") {
    const { data, error } = await context.supabase
      .from("evaluation_cases")
      .select(
        "id, evaluation_type, clinical_summary, status, created_at, patients!evaluation_cases_patient_tenant_fk(first_names, last_names)",
      )
      .eq("branch_id", branchId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error("No fue posible leer las evaluaciones.");
    return data.map((row) => ({
      id: row.id,
      patient: patientName(row.patients),
      title: row.evaluation_type,
      detail: row.clinical_summary ?? "Evaluación en curso",
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  if (kind === "therapies") {
    const { data, error } = await context.supabase
      .from("therapy_plans")
      .select(
        "id, title, objectives, progress, status, created_at, patients!therapy_plans_patient_tenant_fk(first_names, last_names)",
      )
      .eq("branch_id", branchId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error("No fue posible leer los planes terapéuticos.");
    return data.map((row) => ({
      id: row.id,
      patient: patientName(row.patients),
      title: row.title,
      detail: `${row.objectives} · ${row.progress}%`,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  if (kind === "reports") {
    const { data, error } = await context.supabase
      .from("clinical_reports")
      .select(
        "id, title, report_type, status, created_at, patients!clinical_reports_patient_tenant_fk(first_names, last_names)",
      )
      .eq("branch_id", branchId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error("No fue posible leer los informes.");
    return data.map((row) => ({
      id: row.id,
      patient: patientName(row.patients),
      title: row.title,
      detail: row.report_type,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  if (kind === "communications") {
    const { data, error } = await context.supabase
      .from("communications")
      .select(
        "id, channel, recipient, subject, status, created_at, patients!communications_patient_tenant_fk(first_names, last_names)",
      )
      .eq("branch_id", branchId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error("No fue posible leer las comunicaciones.");
    return data.map((row) => ({
      id: row.id,
      patient: patientName(row.patients),
      title: row.subject || `Comunicación por ${row.channel}`,
      detail: `${row.channel} · ${row.recipient}`,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  const [
    { data, error },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    context.supabase
      .from("invoices")
      .select(
        "id, invoice_number, description, total_amount, status, created_at, patients!invoices_patient_tenant_fk(first_names, last_names)",
      )
      .eq("branch_id", branchId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    context.supabase
      .from("payments")
      .select("invoice_id, amount")
      .eq("branch_id", branchId),
  ]);
  if (error || paymentsError) {
    throw new Error("No fue posible leer la facturación.");
  }
  return data.map((row) => ({
    id: row.id,
    patient: patientName(row.patients),
    title: row.invoice_number,
    detail: row.description,
    status: row.status,
    createdAt: row.created_at,
    amount: Number(row.total_amount),
    paid: (payments ?? [])
      .filter((payment) => payment.invoice_id === row.id)
      .reduce((total, payment) => total + Number(payment.amount), 0),
  }));
}

export async function createOperationalRecord(
  kind: OperationalKind,
  formData: FormData,
): Promise<OperationalResult> {
  const parsed = schemas[kind].safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Revisa los campos obligatorios." };
  }
  const context = await getSessionContext();
  if (!context) {
    return {
      ok: false,
      message: "Configura Supabase e inicia sesión para guardar información.",
    };
  }
  const base = {
    organization_id: context.membership.organization_id,
    branch_id: context.membership.branch_id,
    created_by: context.user.id,
  };
  let error: { message: string } | null = null;

  if (kind === "evaluations") {
    const value = parsed.data as z.infer<typeof schemas.evaluations>;
    ({ error } = await context.supabase.from("evaluation_cases").insert({
      ...base,
      patient_id: value.patientId,
      evaluator_id: context.user.id,
      evaluation_type: value.evaluationType,
      clinical_summary: value.summary || null,
    }));
  } else if (kind === "therapies") {
    const value = parsed.data as z.infer<typeof schemas.therapies>;
    ({ error } = await context.supabase.from("therapy_plans").insert({
      ...base,
      patient_id: value.patientId,
      lead_professional_id: context.user.id,
      title: value.title,
      objectives: value.objectives,
      ...(value.startedOn ? { started_on: value.startedOn } : {}),
    }));
  } else if (kind === "reports") {
    const value = parsed.data as z.infer<typeof schemas.reports>;
    ({ error } = await context.supabase.from("clinical_reports").insert({
      ...base,
      patient_id: value.patientId,
      author_id: context.user.id,
      report_type: value.reportType,
      title: value.title,
      content: value.content,
    }));
  } else if (kind === "communications") {
    const value = parsed.data as z.infer<typeof schemas.communications>;
    ({ error } = await context.supabase.from("communications").insert({
      ...base,
      patient_id: value.patientId,
      channel: value.channel,
      recipient: value.recipient,
      subject: value.subject || null,
      body: value.body,
      consent_verified: value.consentVerified === "on",
    }));
  } else {
    const value = parsed.data as z.infer<typeof schemas.billing>;
    const subtotal = Math.round(value.amount * 100) / 100;
    const taxAmount = Math.round(value.taxAmount * 100) / 100;
    ({ error } = await context.supabase.from("invoices").insert({
      ...base,
      patient_id: value.patientId,
      invoice_number: `NW-FAC-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      description: value.description,
      subtotal,
      tax_amount: taxAmount,
      total_amount: subtotal + taxAmount,
      due_on: value.dueOn || null,
    }));
  }

  if (error) {
    return {
      ok: false,
      message: error.message.includes("does not exist")
        ? "Aplica la migración de módulos operativos en Supabase."
        : "No fue posible guardar el registro.",
    };
  }
  revalidatePath(paths[kind]);
  return { ok: true, message: "Registro guardado correctamente." };
}

export async function advanceOperationalRecord(
  kind: Exclude<OperationalKind, "billing">,
  id: string,
): Promise<OperationalResult> {
  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, message: "Registro inválido." };
  const context = await getSessionContext();
  if (!context) return { ok: false, message: "La sesión expiró." };

  const config = {
    evaluations: { table: "evaluation_cases", status: "completed" },
    therapies: { table: "therapy_plans", status: "completed" },
    reports: { table: "clinical_reports", status: "signed" },
    communications: { table: "communications", status: "sent" },
  } as const;
  const target = config[kind];
  const { data, error } = await context.supabase
    .from(target.table)
    .update({ status: target.status })
    .eq("id", parsedId.data)
    .eq("branch_id", context.membership.branch_id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: "No tienes permiso para actualizar el estado." };
  }
  revalidatePath(paths[kind]);
  return { ok: true, message: "Estado actualizado." };
}

export async function registerInvoicePayment(
  invoiceId: string,
  formData: FormData,
): Promise<OperationalResult> {
  const parsed = z
    .object({
      amount: z.coerce.number().positive().max(9999999),
      method: z.enum(["cash", "card", "transfer", "other"]),
      reference: z.string().trim().max(180).optional().or(z.literal("")),
      operationKey: z.uuid(),
    })
    .safeParse(Object.fromEntries(formData));
  const parsedId = z.uuid().safeParse(invoiceId);
  if (!parsed.success || !parsedId.success) {
    return { ok: false, message: "Revisa los datos del pago." };
  }
  const context = await getSessionContext();
  if (!context) return { ok: false, message: "La sesión expiró." };
  const { error } = await context.supabase.from("payments").insert({
    organization_id: context.membership.organization_id,
    branch_id: context.membership.branch_id,
    invoice_id: parsedId.data,
    operation_key: parsed.data.operationKey,
    amount: parsed.data.amount,
    method: parsed.data.method,
    reference: parsed.data.reference || null,
    received_by: context.user.id,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: true, message: "Este pago ya estaba registrado." };
    }
    return {
      ok: false,
      message: error.message.includes("saldo")
        ? "El pago supera el saldo pendiente."
        : "No fue posible registrar el pago.",
    };
  }
  revalidatePath("/facturacion");
  return { ok: true, message: "Pago registrado correctamente." };
}

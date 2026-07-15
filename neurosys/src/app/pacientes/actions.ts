"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Patient } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

const patientSchema = z.object({
  firstNames: z.string().trim().min(2).max(120),
  lastNames: z.string().trim().min(2).max(120),
  documentNumber: z.string().trim().min(5).max(30).optional().or(z.literal("")),
  birthDate: z.iso.date(),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.email().optional().or(z.literal("")),
  referralReason: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type PatientActionResult = {
  ok: boolean;
  message: string;
};

export async function listPatients(): Promise<Patient[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("patients")
    .select(
      "id, clinical_record_number, first_names, last_names, document_number, birth_date, primary_diagnosis, status",
    )
    .is("deleted_at", null)
    .order("last_names")
    .limit(200);

  if (error) return null;

  const statusLabels = {
    active: "Activo",
    follow_up: "Seguimiento",
    evaluation: "Evaluación",
    discharged: "Seguimiento",
    inactive: "Seguimiento",
  } as const;

  return data.map((patient) => {
    const birthDate = new Date(`${patient.birth_date}T00:00:00`);
    const age = Math.max(
      0,
      new Date().getFullYear() -
        birthDate.getFullYear() -
        (new Date() <
        new Date(
          new Date().getFullYear(),
          birthDate.getMonth(),
          birthDate.getDate(),
        )
          ? 1
          : 0),
    );
    const firstNames = patient.first_names.trim();
    const lastNames = patient.last_names.trim();
    const initials = `${firstNames[0] ?? ""}${lastNames[0] ?? ""}`.toUpperCase();

    return {
      id: patient.id,
      initials,
      name: `${firstNames} ${lastNames}`,
      document: patient.document_number ?? "Sin documento",
      age,
      diagnosis: patient.primary_diagnosis ?? "Evaluación inicial",
      professional: "Sin asignar",
      lastVisit: "Sin atenciones",
      nextVisit: "Sin cita",
      status: statusLabels[patient.status as keyof typeof statusLabels],
      color: "bg-indigo-100 text-indigo-700",
    };
  });
}

export async function createPatient(
  formData: FormData,
): Promise<PatientActionResult> {
  const parsed = patientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa los campos obligatorios y sus formatos.",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      message:
        "El modo demostrativo no guarda datos. Configura Supabase para activar el registro.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "La sesión expiró. Ingresa nuevamente." };

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("organization_id, branch_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .not("branch_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.branch_id) {
    return {
      ok: false,
      message: "Tu cuenta no tiene una sede activa asignada.",
    };
  }

  const sequence = crypto.randomUUID().slice(0, 8).toUpperCase();
  const clinicalRecordNumber = `NW-${new Date().getFullYear()}-${sequence}`;
  const { error } = await supabase.from("patients").insert({
    organization_id: membership.organization_id,
    branch_id: membership.branch_id,
    clinical_record_number: clinicalRecordNumber,
    first_names: parsed.data.firstNames,
    last_names: parsed.data.lastNames,
    document_number: parsed.data.documentNumber || null,
    birth_date: parsed.data.birthDate,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    referral_reason: parsed.data.referralReason || null,
    created_by: user.id,
  });

  if (error?.code === "23505") {
    return {
      ok: false,
      message: "Ya existe un paciente con ese documento.",
    };
  }
  if (error) return { ok: false, message: "No fue posible guardar el paciente." };

  revalidatePath("/pacientes");
  return { ok: true, message: "Paciente registrado correctamente." };
}

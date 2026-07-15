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

export type PatientDetail = {
  id: string;
  recordNumber: string;
  initials: string;
  name: string;
  document: string;
  birthDate: string;
  age: number;
  diagnosis: string;
  referralReason: string;
  status: string;
  phone: string;
  email: string;
  address: string;
  guardian: string;
  guardianPhone: string;
  insurance: string;
  allergies: string;
  medications: string;
};

function calculateAge(birthDateValue: string) {
  const birthDate = new Date(`${birthDateValue}T00:00:00`);
  const today = new Date();
  return Math.max(
    0,
    today.getFullYear() -
      birthDate.getFullYear() -
      (today <
      new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
        ? 1
        : 0),
  );
}

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
    discharged: "Alta",
    inactive: "Inactivo",
  } as const;

  return data.map((patient) => {
    const firstNames = patient.first_names.trim();
    const lastNames = patient.last_names.trim();
    const initials = `${firstNames[0] ?? ""}${lastNames[0] ?? ""}`.toUpperCase();

    return {
      id: patient.id,
      recordNumber: patient.clinical_record_number,
      initials,
      name: `${firstNames} ${lastNames}`,
      document: patient.document_number ?? "Sin documento",
      age: calculateAge(patient.birth_date),
      diagnosis: patient.primary_diagnosis ?? "Evaluación inicial",
      professional: "Sin asignar",
      lastVisit: "Sin atenciones",
      nextVisit: "Sin cita",
      status: statusLabels[patient.status as keyof typeof statusLabels],
      color: "bg-indigo-100 text-indigo-700",
    };
  });
}

export async function getPatientById(id: string): Promise<PatientDetail | null> {
  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("patients")
    .select(
      "id, clinical_record_number, first_names, last_names, document_number, birth_date, phone, email, address, legal_guardian_name, legal_guardian_phone, insurance_provider, status, referral_reason, primary_diagnosis, allergies, medications",
    )
    .eq("id", parsedId.data)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  const firstNames = data.first_names.trim();
  const lastNames = data.last_names.trim();
  return {
    id: data.id,
    recordNumber: data.clinical_record_number,
    initials: `${firstNames[0] ?? ""}${lastNames[0] ?? ""}`.toUpperCase(),
    name: `${firstNames} ${lastNames}`,
    document: data.document_number ?? "Sin documento",
    birthDate: data.birth_date,
    age: calculateAge(data.birth_date),
    diagnosis: data.primary_diagnosis ?? "Sin diagnóstico registrado",
    referralReason: data.referral_reason ?? "Sin motivo de consulta registrado",
    status: data.status,
    phone: data.phone ?? "Sin teléfono",
    email: data.email ?? "Sin correo",
    address: data.address ?? "Sin dirección",
    guardian: data.legal_guardian_name ?? "No registrado",
    guardianPhone: data.legal_guardian_phone ?? "Sin teléfono",
    insurance: data.insurance_provider ?? "Particular",
    allergies: data.allergies ?? "Ninguna registrada",
    medications: data.medications ?? "Ninguna registrada",
  };
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
    .order("created_at")
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

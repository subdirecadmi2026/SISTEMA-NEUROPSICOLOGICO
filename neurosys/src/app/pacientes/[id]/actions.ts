"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const clinicalNoteSchema = z.object({
  patientId: z.uuid(),
  noteType: z.enum(["initial", "evolution", "evaluation", "discharge", "other"]),
  title: z.string().trim().min(2).max(160),
  subjective: z.string().trim().max(8000).optional().or(z.literal("")),
  objective: z.string().trim().max(8000).optional().or(z.literal("")),
  assessment: z.string().trim().min(2).max(8000),
  plan: z.string().trim().max(8000).optional().or(z.literal("")),
});

export type ClinicalNote = {
  id: string;
  noteType: string;
  title: string;
  subjective: string | null;
  objective: string | null;
  assessment: string;
  plan: string | null;
  occurredAt: string;
  signedAt: string;
  author: string;
};

export type ClinicalNoteActionResult = {
  ok: boolean;
  message: string;
};

export async function listClinicalNotes(
  patientId: string,
): Promise<ClinicalNote[] | null> {
  const parsedId = z.uuid().safeParse(patientId);
  if (!parsedId.success) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("clinical_notes")
    .select(
      "id, note_type, title, subjective, objective, assessment, plan, occurred_at, signed_at, profiles!clinical_notes_author_id_fkey(full_name)",
    )
    .eq("patient_id", parsedId.data)
    .is("deleted_at", null)
    .eq("status", "signed")
    .order("occurred_at", { ascending: false })
    .limit(100);

  if (error) return [];

  return data.map((note) => {
    const profile = Array.isArray(note.profiles)
      ? note.profiles[0]
      : note.profiles;
    return {
      id: note.id,
      noteType: note.note_type,
      title: note.title,
      subjective: note.subjective,
      objective: note.objective,
      assessment: note.assessment,
      plan: note.plan,
      occurredAt: note.occurred_at,
      signedAt: note.signed_at ?? note.occurred_at,
      author: profile?.full_name ?? "Profesional clínico",
    };
  });
}

export async function createClinicalNote(
  formData: FormData,
): Promise<ClinicalNoteActionResult> {
  const parsed = clinicalNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa el título y el contenido clínico obligatorio.",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      message:
        "El modo demostrativo no guarda evoluciones. Configura Supabase para continuar.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "La sesión expiró." };

  const { data: patient } = await supabase
    .from("patients")
    .select("organization_id, branch_id")
    .eq("id", parsed.data.patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient) {
    return {
      ok: false,
      message: "No tienes acceso al expediente seleccionado.",
    };
  }

  const signedAt = new Date().toISOString();
  const { error } = await supabase.from("clinical_notes").insert({
    organization_id: patient.organization_id,
    branch_id: patient.branch_id,
    patient_id: parsed.data.patientId,
    author_id: user.id,
    note_type: parsed.data.noteType,
    title: parsed.data.title,
    subjective: parsed.data.subjective || null,
    objective: parsed.data.objective || null,
    assessment: parsed.data.assessment,
    plan: parsed.data.plan || null,
    status: "signed",
    signed_at: signedAt,
  });

  if (error) {
    return {
      ok: false,
      message:
        error.code === "42P01"
          ? "Aplica la migración de historia clínica en Supabase."
          : "No fue posible firmar la evolución clínica.",
    };
  }

  revalidatePath(`/pacientes/${parsed.data.patientId}`);
  revalidatePath("/historia-clinica");
  return { ok: true, message: "Evolución firmada y registrada." };
}

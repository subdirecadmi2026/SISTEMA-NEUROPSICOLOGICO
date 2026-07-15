"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const appointmentSchema = z.object({
  patientId: z.uuid(),
  professionalId: z.uuid(),
  serviceName: z.string().trim().min(2).max(160),
  date: z.iso.date(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  reminderConsent: z.literal("on").optional(),
});

export type AppointmentOptions = {
  patients: { id: string; name: string }[];
  professionals: { id: string; name: string }[];
};

export async function getAppointmentOptions(): Promise<AppointmentOptions | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const [{ data: patientRows }, { data: membershipRows }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, first_names, last_names")
      .is("deleted_at", null)
      .order("last_names")
      .limit(200),
    supabase
      .from("memberships")
      .select("user_id, profiles!memberships_user_id_fkey(full_name)")
      .eq("active", true)
      .in("role", ["professional", "clinical_director", "director"]),
  ]);

  return {
    patients: (patientRows ?? []).map((patient) => ({
      id: patient.id,
      name: `${patient.first_names} ${patient.last_names}`,
    })),
    professionals: (membershipRows ?? []).map((membership) => {
      const profile = Array.isArray(membership.profiles)
        ? membership.profiles[0]
        : membership.profiles;
      return {
        id: membership.user_id,
        name: profile?.full_name ?? "Profesional",
      };
    }),
  };
}

export async function createAppointment(formData: FormData) {
  const parsed = appointmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Revisa los datos de la cita." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      message:
        "El modo demostrativo no guarda citas. Configura Supabase para continuar.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "La sesión expiró." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, branch_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .not("branch_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (!membership?.branch_id) {
    return { ok: false, message: "Tu cuenta no tiene una sede asignada." };
  }

  const startsAt = new Date(
    `${parsed.data.date}T${parsed.data.time}:00-05:00`,
  );
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  const { error } = await supabase.from("appointments").insert({
    organization_id: membership.organization_id,
    branch_id: membership.branch_id,
    patient_id: parsed.data.patientId,
    professional_id: parsed.data.professionalId,
    service_name: parsed.data.serviceName,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    notes: parsed.data.notes || null,
    reminder_consent: parsed.data.reminderConsent === "on",
    created_by: user.id,
  });

  if (error?.code === "23P01") {
    return {
      ok: false,
      message: "El profesional ya tiene una cita en ese horario.",
    };
  }
  if (error) return { ok: false, message: "No fue posible guardar la cita." };

  revalidatePath("/agenda");
  return { ok: true, message: "Cita programada correctamente." };
}

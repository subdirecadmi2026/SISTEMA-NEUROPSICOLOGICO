"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const appointmentSchema = z.object({
  branchId: z.uuid(),
  patientId: z.uuid(),
  professionalId: z.uuid(),
  serviceName: z.string().trim().min(2).max(160),
  roomName: z.string().trim().max(120).optional().or(z.literal("")),
  date: z.iso.date(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.coerce.number().int().min(30).max(240),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  reminderConsent: z.literal("on").optional(),
});

export type AppointmentOptions = {
  branchId: string;
  patients: { id: string; name: string }[];
  professionals: { id: string; name: string }[];
};

export type CalendarAppointment = {
  id: string;
  patient: string;
  service: string;
  professional: string;
  room: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

export async function getAppointmentOptions(): Promise<AppointmentOptions | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: currentMembership } = await supabase
    .from("memberships")
    .select("organization_id, branch_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .not("branch_id", "is", null)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!currentMembership?.branch_id) return null;

  const [{ data: patientRows }, { data: membershipRows }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, first_names, last_names")
      .eq("organization_id", currentMembership.organization_id)
      .eq("branch_id", currentMembership.branch_id)
      .is("deleted_at", null)
      .order("last_names")
      .limit(200),
    supabase
      .from("memberships")
      .select(
        "user_id, branch_id, role, profiles!memberships_user_id_fkey(full_name)",
      )
      .eq("organization_id", currentMembership.organization_id)
      .eq("active", true)
      .in("role", [
        "super_admin",
        "professional",
        "clinical_director",
        "director",
      ]),
  ]);

  return {
    branchId: currentMembership.branch_id,
    patients: (patientRows ?? []).map((patient) => ({
      id: patient.id,
      name: `${patient.first_names} ${patient.last_names}`,
    })),
    professionals: (membershipRows ?? [])
      .filter(
        (membership) =>
          membership.branch_id === currentMembership.branch_id ||
          membership.branch_id === null ||
          ["super_admin", "director", "clinical_director"].includes(
            membership.role,
          ),
      )
      .map((membership) => {
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

export async function listAppointments(
  from: string,
  to: string,
  branchId: string,
): Promise<CalendarAppointment[] | null> {
  const rangeSchema = z.object({
    from: z.iso.datetime({ offset: true }),
    to: z.iso.datetime({ offset: true }),
    branchId: z.uuid(),
  });
  const parsed = rangeSchema.safeParse({ from, to, branchId });
  if (!parsed.success) return [];

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, service_name, room_name, starts_at, ends_at, status, patients!appointments_patient_id_fkey(first_names, last_names), profiles!appointments_professional_id_fkey(full_name)",
    )
    .eq("branch_id", parsed.data.branchId)
    .is("deleted_at", null)
    .gte("starts_at", parsed.data.from)
    .lt("starts_at", parsed.data.to)
    .order("starts_at")
    .limit(500);

  if (error) return [];

  return data.map((appointment) => {
    const patient = Array.isArray(appointment.patients)
      ? appointment.patients[0]
      : appointment.patients;
    const professional = Array.isArray(appointment.profiles)
      ? appointment.profiles[0]
      : appointment.profiles;
    return {
      id: appointment.id,
      patient: patient
        ? `${patient.first_names} ${patient.last_names}`
        : "Paciente",
      service: appointment.service_name,
      professional: professional?.full_name ?? "Profesional",
      room: appointment.room_name ?? "Sin sala",
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
      status: appointment.status,
    };
  });
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
    .eq("branch_id", parsed.data.branchId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!membership?.branch_id) {
    return { ok: false, message: "Tu cuenta no tiene una sede asignada." };
  }

  const startsAt = new Date(
    `${parsed.data.date}T${parsed.data.time}:00-05:00`,
  );
  const endsAt = new Date(
    startsAt.getTime() + parsed.data.duration * 60 * 1000,
  );
  const { error } = await supabase.from("appointments").insert({
    organization_id: membership.organization_id,
    branch_id: parsed.data.branchId,
    patient_id: parsed.data.patientId,
    professional_id: parsed.data.professionalId,
    service_name: parsed.data.serviceName,
    room_name: parsed.data.roomName || null,
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
  revalidatePath("/");
  return { ok: true, message: "Cita programada correctamente." };
}

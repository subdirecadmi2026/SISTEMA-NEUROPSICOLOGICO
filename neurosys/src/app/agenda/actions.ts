"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  appointmentStatuses,
  type AppointmentActionResult,
  type AppointmentOptions,
  type AppointmentStatus,
  type CalendarAppointment,
} from "@/lib/agenda/types";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const appointmentSchema = z.object({
  patientId: z.uuid(),
  professionalId: z.uuid(),
  serviceName: z.string().trim().min(2).max(160),
  roomName: z.string().trim().max(120).optional().or(z.literal("")),
  date: z.iso.date(),
  time: timeSchema,
  duration: z.coerce.number().int().min(30).max(240),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  reminderConsent: z.literal("on").optional(),
});

const rangeSchema = z
  .object({
    from: z.iso.datetime({ offset: true }),
    to: z.iso.datetime({ offset: true }),
  })
  .refine(
    ({ from, to }) => {
      const duration = new Date(to).getTime() - new Date(from).getTime();
      return duration > 0 && duration <= 62 * 86_400_000;
    },
    { message: "Rango de agenda inválido." },
  );

const statusSchema = z.object({
  appointmentId: z.uuid(),
  status: z.enum(appointmentStatuses),
  reason: z.string().trim().max(500).optional(),
});

const rescheduleSchema = z.object({
  appointmentId: z.uuid(),
  date: z.iso.date(),
  time: timeSchema,
  duration: z.coerce.number().int().min(30).max(240),
});

const WRITE_ROLES = [
  "super_admin",
  "director",
  "clinical_director",
  "reception",
  "professional",
] as const;

const GLOBAL_ROLES = ["super_admin", "director", "clinical_director"];

const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

async function getSession(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function getCalendarContext(supabase: SupabaseClient, userId: string) {
  const { data: memberships } = await supabase
    .from("memberships")
    .select("organization_id, branch_id, role")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at")
    .limit(20);

  const membership = memberships?.find((item) => item.branch_id) ?? memberships?.[0];
  if (!membership) return null;

  let branchId = membership.branch_id;
  if (!branchId) {
    const { data: branch } = await supabase
      .from("branches")
      .select("id")
      .eq("organization_id", membership.organization_id)
      .eq("active", true)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    branchId = branch?.id ?? null;
  }

  return branchId
    ? {
        organizationId: membership.organization_id,
        branchId,
        role: membership.role,
      }
    : null;
}

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return appointmentStatuses.some((status) => status === value);
}

async function getAuthorizedAppointment(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string,
) {
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, organization_id, branch_id, status")
    .eq("id", appointmentId)
    .is("deleted_at", null)
    .maybeSingle();
  const status = String(appointment?.status ?? "");
  if (!appointment || !isAppointmentStatus(status)) return null;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("branch_id, role")
    .eq("user_id", userId)
    .eq("organization_id", appointment.organization_id)
    .eq("active", true)
    .in("role", [...WRITE_ROLES]);

  const authorized = memberships?.some(
    (membership) =>
      membership.branch_id === appointment.branch_id ||
      membership.branch_id === null ||
      GLOBAL_ROLES.includes(membership.role),
  );
  return authorized ? { ...appointment, status } : null;
}

function databaseError(error: { code?: string; message?: string } | null) {
  if (error?.code === "23P01") {
    return "El profesional ya tiene una cita en ese horario.";
  }
  if (error?.message?.includes("Transición de cita no permitida")) {
    return "La cita cambió y esa acción ya no está permitida.";
  }
  return "No fue posible actualizar la cita.";
}

function refreshAgenda() {
  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function getAppointmentOptions(): Promise<AppointmentOptions | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const user = await getSession(supabase);
  if (!user) return null;

  const context = await getCalendarContext(supabase, user.id);
  if (!context) return null;

  const [{ data: patientRows }, { data: membershipRows }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, first_names, last_names")
      .eq("organization_id", context.organizationId)
      .eq("branch_id", context.branchId)
      .is("deleted_at", null)
      .order("last_names")
      .limit(200),
    supabase
      .from("memberships")
      .select(
        "user_id, branch_id, role, profiles!memberships_user_id_fkey(full_name)",
      )
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .in("role", [
        "super_admin",
        "professional",
        "clinical_director",
        "director",
      ]),
  ]);

  return {
    patients: (patientRows ?? []).map((patient) => ({
      id: patient.id,
      name: `${patient.first_names} ${patient.last_names}`,
    })),
    professionals: (membershipRows ?? [])
      .filter(
        (membership) =>
          membership.branch_id === context.branchId ||
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
): Promise<CalendarAppointment[] | null> {
  const parsed = rangeSchema.safeParse({ from, to });
  if (!parsed.success) return [];

  const supabase = await createClient();
  if (!supabase) return null;
  const user = await getSession(supabase);
  if (!user) return null;
  const context = await getCalendarContext(supabase, user.id);
  if (!context) return [];

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, service_name, room_name, starts_at, ends_at, status, cancellation_reason, checked_in_at, started_at, completed_at, patients!appointments_patient_id_fkey(first_names, last_names), profiles!appointments_professional_id_fkey(full_name)",
    )
    .eq("organization_id", context.organizationId)
    .eq("branch_id", context.branchId)
    .is("deleted_at", null)
    .gte("starts_at", parsed.data.from)
    .lt("starts_at", parsed.data.to)
    .order("starts_at")
    .limit(500);

  if (error) return [];

  return data.flatMap((appointment) => {
    if (!isAppointmentStatus(appointment.status)) return [];
    const patient = Array.isArray(appointment.patients)
      ? appointment.patients[0]
      : appointment.patients;
    const professional = Array.isArray(appointment.profiles)
      ? appointment.profiles[0]
      : appointment.profiles;
    return [{
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
        cancellationReason: appointment.cancellation_reason,
        checkedInAt: appointment.checked_in_at,
        startedAt: appointment.started_at,
        completedAt: appointment.completed_at,
      }];
  });
}

export async function createAppointment(
  formData: FormData,
): Promise<AppointmentActionResult> {
  const parsed = appointmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Revisa los datos de la cita." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      message: "La agenda no está conectada.",
    };
  }

  const user = await getSession(supabase);
  if (!user) return { ok: false, message: "La sesión expiró." };

  const context = await getCalendarContext(supabase, user.id);
  if (!context || !WRITE_ROLES.includes(context.role)) {
    return { ok: false, message: "No tienes permisos para agendar citas." };
  }

  const [{ data: patient }, { data: professionalMemberships }] = await Promise.all([
    supabase
      .from("patients")
      .select("id")
      .eq("id", parsed.data.patientId)
      .eq("organization_id", context.organizationId)
      .eq("branch_id", context.branchId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("memberships")
      .select("branch_id, role")
      .eq("user_id", parsed.data.professionalId)
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .in("role", ["super_admin", "director", "clinical_director", "professional"]),
  ]);
  const professionalIsValid = professionalMemberships?.some(
    (membership) =>
      membership.branch_id === context.branchId ||
      membership.branch_id === null ||
      GLOBAL_ROLES.includes(membership.role),
  );
  if (!patient || !professionalIsValid) {
    return { ok: false, message: "Paciente o profesional no válido para esta sede." };
  }

  const startsAt = new Date(
    `${parsed.data.date}T${parsed.data.time}:00-05:00`,
  );
  const endsAt = new Date(
    startsAt.getTime() + parsed.data.duration * 60 * 1000,
  );
  const { error } = await supabase.from("appointments").insert({
    organization_id: context.organizationId,
    branch_id: context.branchId,
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

  refreshAgenda();
  return { ok: true, message: "Cita programada correctamente." };
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  reason?: string,
): Promise<AppointmentActionResult> {
  const parsed = statusSchema.safeParse({ appointmentId, status, reason });
  if (!parsed.success) return { ok: false, message: "Acción no válida." };
  if (parsed.data.status === "cancelled" && !parsed.data.reason) {
    return { ok: false, message: "Indica el motivo de cancelación." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "La agenda no está conectada." };
  const user = await getSession(supabase);
  if (!user) return { ok: false, message: "La sesión expiró." };

  const appointment = await getAuthorizedAppointment(
    supabase,
    user.id,
    parsed.data.appointmentId,
  );
  if (!appointment) {
    return { ok: false, message: "No tienes acceso a esta cita." };
  }
  if (!validTransitions[appointment.status].includes(parsed.data.status)) {
    return { ok: false, message: "Esa transición ya no está permitida." };
  }

  const { data: updated, error } = await supabase
    .from("appointments")
    .update({
      status: parsed.data.status,
      cancellation_reason:
        parsed.data.status === "cancelled" ? parsed.data.reason : null,
    })
    .eq("id", appointment.id)
    .eq("organization_id", appointment.organization_id)
    .eq("branch_id", appointment.branch_id)
    .eq("status", appointment.status)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: databaseError(error) };
  if (!updated) {
    return { ok: false, message: "La cita cambió; actualiza la agenda e inténtalo de nuevo." };
  }
  refreshAgenda();
  return { ok: true, message: "Estado actualizado." };
}

export async function rescheduleAppointment(
  formData: FormData,
): Promise<AppointmentActionResult> {
  const parsed = rescheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Revisa la nueva fecha, hora y duración." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "La agenda no está conectada." };
  const user = await getSession(supabase);
  if (!user) return { ok: false, message: "La sesión expiró." };

  const appointment = await getAuthorizedAppointment(
    supabase,
    user.id,
    parsed.data.appointmentId,
  );
  if (!appointment) {
    return { ok: false, message: "No tienes acceso a esta cita." };
  }
  if (!["pending", "confirmed"].includes(appointment.status)) {
    return { ok: false, message: "Solo se reprograman citas pendientes o confirmadas." };
  }

  const startsAt = new Date(`${parsed.data.date}T${parsed.data.time}:00-05:00`);
  const endsAt = new Date(
    startsAt.getTime() + parsed.data.duration * 60 * 1000,
  );
  const { data: updated, error } = await supabase
    .from("appointments")
    .update({
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .eq("id", appointment.id)
    .eq("organization_id", appointment.organization_id)
    .eq("branch_id", appointment.branch_id)
    .eq("status", appointment.status)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: databaseError(error) };
  if (!updated) {
    return { ok: false, message: "La cita cambió; actualiza la agenda e inténtalo de nuevo." };
  }
  refreshAgenda();
  return { ok: true, message: "Cita reprogramada." };
}

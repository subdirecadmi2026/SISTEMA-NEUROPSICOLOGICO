export const appointmentStatuses = [
  "pending",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type AppointmentStatus = (typeof appointmentStatuses)[number];
export type CalendarView = "week" | "month";

export type AppointmentOptions = {
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
  status: AppointmentStatus;
  cancellationReason: string | null;
  checkedInAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type AppointmentActionResult = {
  ok: boolean;
  message: string;
};

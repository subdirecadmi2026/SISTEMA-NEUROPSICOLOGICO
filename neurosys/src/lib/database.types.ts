export type AppRole = "Administrador" | "Supervisor" | "Jefe de enfermería";
export type ScheduleStatus = "Borrador" | "En revisión" | "Aprobado";

export type ProfileRow = {
  id: string;
  organization_id: string;
  service_id: string | null;
  full_name: string;
  email: string;
  role: AppRole;
  is_active: boolean;
};

export type ServiceRow = {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  leader_name: string;
  coverage: string;
  is_active: boolean;
};

export type StaffRow = {
  id: string;
  organization_id: string;
  service_id: string;
  full_name: string;
  document: string;
  position: string;
  status: "Activo" | "Vacaciones" | "Inactivo";
};

export type ShiftCodeRow = {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  hours: number;
  color: string;
  is_active: boolean;
};

export type ScheduleRow = {
  id: string;
  organization_id: string;
  service_id: string;
  name: string;
  month: number;
  year: number;
  status: ScheduleStatus;
  coverage_percentage: number;
  created_by: string;
  reviewed_by: string | null;
  approved_at: string | null;
};

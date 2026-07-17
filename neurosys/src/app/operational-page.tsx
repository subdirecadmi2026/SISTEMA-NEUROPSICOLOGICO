import {
  getOperationalOptions,
  listOperationalRecords,
  type OperationalKind,
  type OperationalOptions,
  type OperationalRow,
} from "./operational-actions";
import { ModuleWorkspace } from "@/components/module-workspace";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const demoOptions: OperationalOptions = {
  branchId: "00000000-0000-4000-8000-000000000021",
  patients: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Mateo Guerrero",
      phone: "+593 99 428 1620",
      email: "familia.guerrero@correo.com",
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      name: "Sofía Andrade",
      phone: "+593 98 000 0000",
      email: "familia.andrade@correo.com",
    },
  ],
};

const demoRows: Record<OperationalKind, OperationalRow[]> = {
  evaluations: [
    {
      id: "00000000-0000-4000-8000-000000000101",
      patient: "Mateo Guerrero",
      title: "Reevaluación de funciones ejecutivas",
      detail: "Aplicación e interpretación en curso",
      status: "in_progress",
      createdAt: "2026-07-15T10:00:00-05:00",
    },
  ],
  therapies: [
    {
      id: "00000000-0000-4000-8000-000000000102",
      patient: "Sofía Andrade",
      title: "Plan de regulación emocional",
      detail: "Comunicación funcional y autorregulación · 60%",
      status: "active",
      createdAt: "2026-07-10T10:00:00-05:00",
    },
  ],
  reports: [
    {
      id: "00000000-0000-4000-8000-000000000103",
      patient: "Mateo Guerrero",
      title: "Informe neuropsicológico",
      detail: "Resultados y recomendaciones clínicas",
      status: "draft",
      createdAt: "2026-07-14T10:00:00-05:00",
    },
  ],
  communications: [
    {
      id: "00000000-0000-4000-8000-000000000104",
      patient: "Mateo Guerrero",
      title: "Recordatorio de sesión",
      detail: "whatsapp · +593 99 428 1620",
      status: "scheduled",
      createdAt: "2026-07-15T09:00:00-05:00",
    },
  ],
  billing: [
    {
      id: "00000000-0000-4000-8000-000000000105",
      patient: "Mateo Guerrero",
      title: "NW-FAC-2026-DEMO",
      detail: "Evaluación neuropsicológica",
      status: "partially_paid",
      createdAt: "2026-07-15T08:00:00-05:00",
      amount: 120,
      paid: 60,
    },
  ],
};

export async function OperationalPage({ kind }: { kind: OperationalKind }) {
  const [records, options] = await Promise.all([
    listOperationalRecords(kind),
    getOperationalOptions(),
  ]);
  const connected =
    isSupabaseConfigured && records !== null && options !== null;
  return (
    <ModuleWorkspace
      kind={kind}
      rows={records ?? (isSupabaseConfigured ? [] : demoRows[kind])}
      options={
        options ??
        (isSupabaseConfigured
          ? { branchId: "", patients: [] }
          : demoOptions)
      }
      connected={connected}
    />
  );
}

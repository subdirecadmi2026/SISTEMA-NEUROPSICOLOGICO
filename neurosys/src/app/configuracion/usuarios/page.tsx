import { UsersRound } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getTeamData } from "./actions";
import { TeamManager } from "./team-manager";
import type { TeamBranch, TeamMember } from "./team-types";

const demoBranches: TeamBranch[] = [
  { id: "demo-principal", name: "Sede principal" },
  { id: "demo-norte", name: "Sede norte" },
];

const demoMembers: TeamMember[] = [
  {
    id: "demo-admin",
    userId: "demo-admin",
    organizationId: "demo-organization",
    organizationName: "Centro Ñampi Wasi",
    name: "Dra. Daniela Romero",
    role: "super_admin",
    active: true,
    isCurrentUser: true,
  },
  {
    id: "demo-director",
    userId: "demo-director",
    organizationId: "demo-organization",
    organizationName: "Centro Ñampi Wasi",
    name: "Dr. Diego Romero",
    role: "director",
    active: true,
    isCurrentUser: false,
  },
  {
    id: "demo-professional",
    userId: "demo-professional",
    organizationId: "demo-organization",
    organizationName: "Centro Ñampi Wasi",
    name: "Ps. Carlos Mena",
    role: "professional",
    active: true,
    isCurrentUser: false,
  },
  {
    id: "demo-inactive",
    userId: "demo-inactive",
    organizationId: "demo-organization",
    organizationName: "Centro Ñampi Wasi",
    name: "Lic. María León",
    role: "professional",
    active: false,
    isCurrentUser: false,
  },
];

export default async function TeamSettingsPage() {
  const result = isSupabaseConfigured ? await getTeamData() : null;
  const demo = !isSupabaseConfigured;
  const data = result?.status === "ok" ? result.data : null;

  return (
    <main className="p-4 sm:p-7 lg:p-9">
      <div className="mb-7 flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
          <UsersRound size={20} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">
            Configuración
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            Equipo y permisos
          </h1>
        </div>
      </div>
      {isSupabaseConfigured && result?.status !== "ok" ? (
        <section
          role="alert"
          className="rounded-2xl border border-rose-200 bg-white p-7 shadow-sm"
        >
          <h2 className="text-sm font-bold text-slate-900">
            No se puede mostrar el equipo
          </h2>
          <p className="mt-2 text-xs leading-6 text-rose-700">
            {result?.message ?? "No fue posible validar el acceso."}
          </p>
        </section>
      ) : (
        <>
          {demo && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-800">
          Vista demostrativa: los cambios se reflejan visualmente y no se
          guardan.
        </div>
          )}
          <TeamManager
            initialMembers={data?.members ?? demoMembers}
            organizationId={data?.organizationId ?? "demo-organization"}
            organizationName={data?.organizationName ?? "Centro Ñampi Wasi"}
            canManage={data?.canManage ?? true}
            managerRole={data?.managerRole ?? "super_admin"}
            branches={data?.branches ?? demoBranches}
            demo={demo}
          />
        </>
      )}
    </main>
  );
}

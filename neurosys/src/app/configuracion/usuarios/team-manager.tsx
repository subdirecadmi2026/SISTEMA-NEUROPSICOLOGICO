"use client";

import { MailPlus, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";
import {
  changeMemberRole,
  inviteMember,
  setMemberActive,
} from "./actions";
import {
  type AppRole,
  roles,
  type TeamBranch,
  type TeamMember,
} from "./team-types";

const roleLabels: Record<AppRole, string> = {
  super_admin: "Superadministrador",
  director: "Director",
  clinical_director: "Dirección clínica",
  reception: "Recepción",
  professional: "Profesional",
  cashier: "Caja",
  accounting: "Contabilidad",
  inventory: "Inventario",
  patient: "Paciente",
};

export function TeamManager({
  initialMembers,
  organizationId,
  organizationName,
  canManage,
  managerRole,
  branches,
  demo,
}: {
  initialMembers: TeamMember[];
  organizationId: string;
  organizationName: string;
  canManage: boolean;
  managerRole: AppRole;
  branches: TeamBranch[];
  demo: boolean;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const isSuperAdmin = managerRole === "super_admin";

  function updateRole(member: TeamMember, role: AppRole) {
    if (
      !isSuperAdmin &&
      (member.role === "super_admin" || role === "super_admin")
    ) {
      setNotice({
        ok: false,
        message: "Solo un superadministrador puede gestionar ese rol.",
      });
      return;
    }
    if (
      member.role === "super_admin" &&
      role !== "super_admin" &&
      members.filter((item) => item.active && item.role === "super_admin")
        .length <= 1
    ) {
      setNotice({
        ok: false,
        message: "La organización debe conservar al menos un superadministrador.",
      });
      return;
    }
    if (demo) {
      setMembers((current) =>
        current.map((item) => (item.id === member.id ? { ...item, role } : item)),
      );
      setNotice({ ok: true, message: "Rol actualizado en la vista demostrativa." });
      return;
    }
    startTransition(async () => {
      const result = await changeMemberRole(member.id, role);
      setNotice(result);
      if (result.ok) {
        setMembers((current) =>
          current.map((item) =>
            item.id === member.id ? { ...item, role } : item,
          ),
        );
      }
    });
  }

  function toggleMember(member: TeamMember) {
    if (member.isCurrentUser && member.active) {
      setNotice({ ok: false, message: "No puedes desactivar tu propia membresía." });
      return;
    }
    if (
      member.active &&
      member.role === "super_admin" &&
      members.filter((item) => item.active && item.role === "super_admin")
        .length <= 1
    ) {
      setNotice({
        ok: false,
        message: "La organización debe conservar al menos un superadministrador.",
      });
      return;
    }
    if (demo) {
      setMembers((current) =>
        current.map((item) =>
          item.id === member.id ? { ...item, active: !item.active } : item,
        ),
      );
      setNotice({ ok: true, message: "Estado actualizado en la vista demostrativa." });
      return;
    }
    startTransition(async () => {
      const result = await setMemberActive(member.id, !member.active);
      setNotice(result);
      if (result.ok) {
        setMembers((current) =>
          current.map((item) =>
            item.id === member.id ? { ...item, active: !item.active } : item,
          ),
        );
      }
    });
  }

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!isSuperAdmin && data.get("role") === "super_admin") {
      setNotice({
        ok: false,
        message: "Solo un superadministrador puede otorgar ese rol.",
      });
      return;
    }
    if (demo) {
      const fullName = String(data.get("fullName")).trim();
      const role = String(data.get("role")) as AppRole;
      setMembers((current) => [
        ...current,
        {
          id: `demo-${Date.now()}`,
          userId: `demo-${Date.now()}`,
          organizationId,
          organizationName,
          name: fullName,
          role,
          active: true,
          isCurrentUser: false,
        },
      ]);
      setNotice({ ok: true, message: "Invitación simulada y fila añadida." });
      form.reset();
      return;
    }
    startTransition(async () => {
      const result = await inviteMember(organizationId, data);
      setNotice(result);
      if (result.ok) form.reset();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Miembros</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {organizationName} · {members.length} cuentas
            </p>
          </div>
          <ShieldCheck size={20} className="text-indigo-500" />
        </div>
        <div className="divide-y divide-slate-100">
          {members.map((member) => (
            <div
              key={member.id}
              className={`grid gap-4 p-5 md:grid-cols-[1fr_190px_120px] md:items-center ${
                member.active ? "" : "bg-slate-50 opacity-70"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {member.name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {member.name}
                    {member.isCurrentUser && (
                      <span className="ml-2 text-[9px] font-bold uppercase text-indigo-500">
                        Tú
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {member.active ? "Acceso activo" : "Acceso desactivado"}
                  </p>
                </div>
              </div>
              <select
                aria-label={`Rol de ${member.name}`}
                value={member.role}
                disabled={
                  !canManage ||
                  isPending ||
                  !member.active ||
                  (!isSuperAdmin && member.role === "super_admin")
                }
                onChange={(event) =>
                  updateRole(member, event.target.value as AppRole)
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-medium outline-none focus:border-indigo-400 disabled:bg-slate-50"
              >
                {roles.map((role) => (
                  <option
                    key={role}
                    value={role}
                    disabled={role === "super_admin" && !isSuperAdmin}
                  >
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={
                  !canManage ||
                  isPending ||
                  (member.isCurrentUser && member.active) ||
                  (!isSuperAdmin && member.role === "super_admin")
                }
                onClick={() => toggleMember(member)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
                  member.active
                    ? "border-rose-200 text-rose-600"
                    : "border-emerald-200 text-emerald-700"
                }`}
              >
                {member.active ? <UserX size={14} /> : <UserCheck size={14} />}
                {member.active ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <MailPlus size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Invitar miembro</h2>
            <p className="mt-1 text-[10px] text-slate-500">
              Recibirá un acceso seguro por correo.
            </p>
          </div>
        </div>
        <form onSubmit={submitInvite} className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="text-[10px] font-semibold text-slate-600">
              Nombre completo
            </span>
            <input
              name="fullName"
              required
              minLength={2}
              maxLength={160}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-400"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-[10px] font-semibold text-slate-600">
              Correo
            </span>
            <input
              name="email"
              type="email"
              required
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-400"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-[10px] font-semibold text-slate-600">Rol</span>
            <select
              name="role"
              defaultValue="professional"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-indigo-400"
            >
              {roles.map((role) => (
                <option
                  key={role}
                  value={role}
                  disabled={role === "super_admin" && !isSuperAdmin}
                >
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-[10px] font-semibold text-slate-600">Sede</span>
            <select
              name="branchId"
              required
              defaultValue={branches[0]?.id ?? ""}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-indigo-400"
            >
              {branches.length === 0 && (
                <option value="">No hay sedes activas</option>
              )}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={!canManage || isPending || branches.length === 0}
            className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white disabled:opacity-50"
          >
            {isPending ? "Procesando..." : "Enviar invitación"}
          </button>
        </form>
        {notice && (
          <p
            role={notice.ok ? "status" : "alert"}
            className={`mt-4 text-[10px] font-medium leading-5 ${
              notice.ok ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            {notice.message}
          </p>
        )}
        {!canManage && (
          <p className="mt-4 text-[10px] leading-5 text-amber-700">
            Solo superadministradores y directores pueden gestionar el equipo.
          </p>
        )}
        {canManage && branches.length === 0 && (
          <p className="mt-4 text-[10px] leading-5 text-amber-700">
            Activa al menos una sede antes de invitar miembros.
          </p>
        )}
      </aside>
    </div>
  );
}

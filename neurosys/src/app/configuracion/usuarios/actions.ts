"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  type AppRole,
  roles,
  type TeamActionResult,
  type TeamDataResult,
} from "./team-types";

const managementRoles: AppRole[] = ["super_admin", "director"];

function relatedOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getTeamData(): Promise<TeamDataResult> {
  const supabase = await createClient();
  if (!supabase) {
    return { status: "error", message: "Supabase no está configurado." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "unauthorized", message: "La sesión expiró. Ingresa nuevamente." };
  }

  const { data: ownMemberships, error: ownMembershipsError } = await supabase
    .from("memberships")
    .select("organization_id, role, organizations(trade_name)")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at");
  if (ownMembershipsError) {
    return { status: "error", message: "No fue posible cargar tu organización." };
  }
  const ownMembership =
    ownMemberships?.find((item) => item.role === "super_admin") ??
    ownMemberships?.find((item) => item.role === "director") ??
    ownMemberships?.[0];
  if (!ownMembership) {
    return {
      status: "forbidden",
      message: "Tu cuenta no tiene una membresía activa para consultar el equipo.",
    };
  }

  const organization = relatedOne(ownMembership.organizations);
  const [{ data, error }, { data: branches, error: branchesError }] =
    await Promise.all([
      supabase
        .from("memberships")
        .select(
          "id, user_id, organization_id, role, active, profiles!memberships_user_id_fkey(full_name)",
        )
        .eq("organization_id", ownMembership.organization_id)
        .order("created_at"),
      supabase
        .from("branches")
        .select("id, name")
        .eq("organization_id", ownMembership.organization_id)
        .eq("active", true)
        .order("name"),
    ]);
  if (error || branchesError) {
    return { status: "error", message: "No fue posible cargar el equipo y sus sedes." };
  }

  return {
    status: "ok",
    data: {
      organizationId: ownMembership.organization_id,
      organizationName: organization?.trade_name ?? "Organización",
      canManage: managementRoles.includes(ownMembership.role as AppRole),
      managerRole: ownMembership.role as AppRole,
      branches: branches ?? [],
      members: data.map((membership) => ({
        id: membership.id,
        userId: membership.user_id,
        organizationId: membership.organization_id,
        organizationName: organization?.trade_name ?? "Organización",
        name:
          relatedOne(membership.profiles)?.full_name ?? "Usuario sin perfil",
        role: membership.role as AppRole,
        active: membership.active,
        isCurrentUser: membership.user_id === user.id,
      })),
    },
  };
}

async function getAuthorizedTarget(membershipId: string) {
  const parsed = z.uuid().safeParse(membershipId);
  if (!parsed.success) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: target } = await supabase
    .from("memberships")
    .select("id, organization_id, user_id, role, active")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!target) return null;

  const { data: owners } = await supabase
    .from("memberships")
    .select("id, role")
    .eq("organization_id", target.organization_id)
    .eq("user_id", user.id)
    .eq("active", true)
    .in("role", managementRoles);
  const owner =
    owners?.find((membership) => membership.role === "super_admin") ??
    owners?.[0];
  if (!owner) return null;
  return { supabase, user, target, owner };
}

export async function changeMemberRole(
  membershipId: string,
  role: string,
): Promise<TeamActionResult> {
  const parsedRole = z.enum(roles).safeParse(role);
  if (!parsedRole.success) return { ok: false, message: "Rol no válido." };
  const context = await getAuthorizedTarget(membershipId);
  if (!context) {
    return { ok: false, message: "No tienes permiso sobre este miembro." };
  }
  if (
    context.owner.role === "director" &&
    (context.target.role === "super_admin" ||
      parsedRole.data === "super_admin")
  ) {
    return {
      ok: false,
      message: "Solo un superadministrador puede gestionar ese rol.",
    };
  }

  if (
    context.target.role === "super_admin" &&
    parsedRole.data !== "super_admin"
  ) {
    const { count } = await context.supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.target.organization_id)
      .eq("role", "super_admin")
      .eq("active", true);
    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        message: "La organización debe conservar al menos un superadministrador.",
      };
    }
  }

  const { data, error } = await context.supabase
    .from("memberships")
    .update({ role: parsedRole.data })
    .eq("id", context.target.id)
    .eq("organization_id", context.target.organization_id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return {
      ok: false,
      message: error?.message.includes("superadministrador")
        ? "La organización debe conservar al menos un superadministrador."
        : "No fue posible actualizar el rol.",
    };
  }
  revalidatePath("/configuracion/usuarios");
  return { ok: true, message: "Rol actualizado." };
}

export async function setMemberActive(
  membershipId: string,
  active: boolean,
): Promise<TeamActionResult> {
  const parsedActive = z.boolean().safeParse(active);
  if (!parsedActive.success) return { ok: false, message: "Estado no válido." };
  const context = await getAuthorizedTarget(membershipId);
  if (!context) {
    return { ok: false, message: "No tienes permiso sobre este miembro." };
  }
  if (
    context.owner.role === "director" &&
    context.target.role === "super_admin"
  ) {
    return {
      ok: false,
      message: "Solo un superadministrador puede gestionar ese rol.",
    };
  }
  if (!active && context.target.user_id === context.user.id) {
    return { ok: false, message: "No puedes desactivar tu propia membresía." };
  }
  if (!active && context.target.role === "super_admin") {
    const { count } = await context.supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.target.organization_id)
      .eq("role", "super_admin")
      .eq("active", true);
    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        message: "La organización debe conservar al menos un superadministrador.",
      };
    }
  }

  const { data, error } = await context.supabase
    .from("memberships")
    .update({ active })
    .eq("id", context.target.id)
    .eq("organization_id", context.target.organization_id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return {
      ok: false,
      message:
        error?.message.includes("propia membresía") ||
        error?.message.includes("superadministrador")
          ? error.message
          : "No fue posible cambiar el estado.",
    };
  }
  revalidatePath("/configuracion/usuarios");
  return {
    ok: true,
    message: active ? "Miembro activado." : "Miembro desactivado.",
  };
}

export async function inviteMember(
  organizationId: string,
  formData: FormData,
): Promise<TeamActionResult> {
  const parsed = z
    .object({
      organizationId: z.uuid(),
      branchId: z.uuid(),
      email: z.email(),
      fullName: z.string().trim().min(2).max(160),
      role: z.enum(roles),
    })
    .safeParse({
      organizationId,
      branchId: String(formData.get("branchId")),
      email: String(formData.get("email")).trim().toLowerCase(),
      fullName: String(formData.get("fullName")),
      role: String(formData.get("role")),
    });
  if (!parsed.success) {
    return { ok: false, message: "Revisa los datos de la invitación." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: true, message: "Invitación simulada en modo demostrativo." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "La sesión expiró." };

  const { data: owners } = await supabase
    .from("memberships")
    .select("id, role")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", user.id)
    .eq("active", true)
    .in("role", managementRoles);
  const owner =
    owners?.find((membership) => membership.role === "super_admin") ??
    owners?.[0];
  if (!owner) return { ok: false, message: "No puedes invitar a esta organización." };
  if (owner.role === "director" && parsed.data.role === "super_admin") {
    return {
      ok: false,
      message: "Solo un superadministrador puede otorgar ese rol.",
    };
  }

  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("id", parsed.data.branchId)
    .eq("organization_id", parsed.data.organizationId)
    .eq("active", true)
    .maybeSingle();
  if (!branch) {
    return { ok: false, message: "La sede no pertenece a esta organización." };
  }

  const { error } = await supabase.functions.invoke("invite-member", {
    body: parsed.data,
  });
  if (error) {
    return {
      ok: false,
      message: "No fue posible enviar la invitación. Verifica que el correo no esté registrado.",
    };
  }
  revalidatePath("/configuracion/usuarios");
  return { ok: true, message: "Invitación enviada correctamente." };
}

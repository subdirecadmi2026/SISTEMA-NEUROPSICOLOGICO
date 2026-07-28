import { createClient } from "@/lib/supabase/client";
import type { Profile, Role } from "@/types";

export type CloudAuthResult =
  | { ok: true; profile: Profile; message: string }
  | { ok: false; message: string; needsProfile?: boolean; userId?: string; email?: string };

export async function signInWithSupabase(
  email: string,
  password: string,
): Promise<CloudAuthResult> {
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, message: "Supabase no configurado" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    return {
      ok: false,
      message: error?.message ?? "No se pudo iniciar sesión en Supabase",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, sucursal_id, active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  if (!profile) {
    return {
      ok: false,
      message: "Usuario Auth OK, pero falta fila en profiles",
      needsProfile: true,
      userId: data.user.id,
      email: data.user.email ?? email,
    };
  }

  if (!profile.active) {
    return { ok: false, message: "Usuario inactivo" };
  }

  return {
    ok: true,
    message: "Sesión Supabase iniciada",
    profile: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role as Role,
      sucursal_id: profile.sucursal_id,
      active: profile.active,
    },
  };
}

export async function bootstrapProfile(input: {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  sucursalId: string | null;
}): Promise<CloudAuthResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, message: "Supabase no configurado" };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: input.userId,
        email: input.email,
        full_name: input.fullName,
        role: input.role,
        sucursal_id: input.sucursalId,
        active: true,
      },
      { onConflict: "id" },
    )
    .select("id, email, full_name, role, sucursal_id, active")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message:
        error?.message ??
        "No se pudo crear el perfil. Ejecuta SETUP_PART2.sql y vuelve a intentar.",
    };
  }

  return {
    ok: true,
    message: "Perfil creado",
    profile: {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role as Role,
      sucursal_id: data.sucursal_id,
      active: data.active,
    },
  };
}

export async function fetchRemoteCatalog() {
  const supabase = createClient();
  if (!supabase) return null;

  const [sucursales, categories, productos] = await Promise.all([
    supabase.from("sucursales").select("*").order("name"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("productos").select("*").eq("active", true).order("name"),
  ]);

  if (sucursales.error || categories.error || productos.error) {
    return null;
  }

  return {
    sucursales: sucursales.data ?? [],
    categories: categories.data ?? [],
    productos: productos.data ?? [],
  };
}

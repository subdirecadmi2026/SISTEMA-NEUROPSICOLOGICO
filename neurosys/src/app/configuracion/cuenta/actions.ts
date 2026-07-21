"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AccountActionResult = {
  ok: boolean;
  message: string;
};

const nameSchema = z.string().trim().min(2).max(160);
const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Za-z]/)
  .regex(/[0-9]/);

export async function updateProfileName(
  fullName: string,
): Promise<AccountActionResult> {
  const parsed = nameSchema.safeParse(fullName);
  if (!parsed.success) {
    return { ok: false, message: "El nombre debe tener entre 2 y 160 caracteres." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: true, message: "Vista previa actualizada en modo demostrativo." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "La sesión expiró. Ingresa nuevamente." };

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: "No fue posible actualizar el nombre." };
  }

  revalidatePath("/configuracion/cuenta");
  return { ok: true, message: "Nombre actualizado correctamente." };
}

export async function updateAccountPassword(
  password: string,
  confirmation: string,
): Promise<AccountActionResult> {
  if (password !== confirmation) {
    return { ok: false, message: "Las contraseñas no coinciden." };
  }
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Usa al menos 8 caracteres e incluye letras y números.",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: true, message: "Contraseña simulada en modo demostrativo." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "La sesión expiró. Ingresa nuevamente." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return {
      ok: false,
      message:
        error.status === 0
          ? "No pudimos conectarnos. Revisa tu red."
          : "No fue posible cambiar la contraseña.",
    };
  }
  return { ok: true, message: "Contraseña actualizada correctamente." };
}

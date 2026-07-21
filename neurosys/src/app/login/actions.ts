"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(256),
});

export type LoginResult = {
  ok: boolean;
  message: string;
};

export async function signIn(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email")).trim().toLowerCase(),
    password: String(formData.get("password")),
  });
  if (!parsed.success) {
    return { ok: false, message: "Revisa el correo y la contraseña." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, message: "Supabase aún no está configurado." };
  }

  try {
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (!error) return { ok: true, message: "Acceso correcto." };

    const networkFailure =
      error.status === 0 ||
      error.name === "AuthRetryableFetchError" ||
      error.message.toLowerCase().includes("fetch");
    return {
      ok: false,
      message: networkFailure
        ? "No pudimos conectar con el servicio de acceso. Inténtalo nuevamente."
        : "Correo o contraseña incorrectos.",
    };
  } catch {
    return {
      ok: false,
      message: "No pudimos conectar con el servicio de acceso. Inténtalo nuevamente.",
    };
  }
}

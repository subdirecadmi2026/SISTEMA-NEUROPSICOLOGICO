import { createClient } from "npm:@supabase/supabase-js@2";

const roles = new Set([
  "super_admin",
  "director",
  "clinical_director",
  "reception",
  "professional",
  "cashier",
  "accounting",
  "inventory",
  "patient",
]);

function getSafeAppOrigin() {
  const value = Deno.env.get("APP_ORIGIN")?.trim().replace(/\/$/, "");
  if (!value) return null;
  try {
    const url = new URL(value);
    const local =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (
      url.origin !== value ||
      (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

const appOrigin = getSafeAppOrigin();
const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin ?? "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey || !appOrigin) {
    return json({ error: "Configuración incompleta." }, 500);
  }

  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Autenticación requerida." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) return json({ error: "Sesión inválida." }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }

  const organizationId =
    typeof body.organizationId === "string" ? body.organizationId : "";
  const branchId = typeof body.branchId === "string" ? body.branchId : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const role = typeof body.role === "string" ? body.role : "";
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    !uuidPattern.test(organizationId) ||
    !uuidPattern.test(branchId) ||
    !emailPattern.test(email) ||
    fullName.length < 2 ||
    fullName.length > 160 ||
    !roles.has(role)
  ) {
    return json({ error: "Revisa los datos de la invitación." }, 400);
  }

  const { data: managers, error: managerError } = await admin
    .from("memberships")
    .select("id, role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("active", true)
    .in("role", ["super_admin", "director"]);
  const manager =
    managers?.find((membership) => membership.role === "super_admin") ??
    managers?.[0];
  if (managerError || !manager) {
    return json({ error: "No tienes permiso para invitar a esta organización." }, 403);
  }
  if (manager.role === "director" && role === "super_admin") {
    return json({ error: "Solo un superadministrador puede otorgar ese rol." }, 403);
  }

  const { data: branch, error: branchError } = await admin
    .from("branches")
    .select("id")
    .eq("id", branchId)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .maybeSingle();
  if (branchError || !branch) {
    return json({ error: "La sede no pertenece a esta organización." }, 400);
  }

  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, must_set_password: true },
      redirectTo: `${appOrigin}/auth/callback?next=%2Fconfiguracion%2Fcuenta`,
    });
  if (inviteError || !invited.user) {
    return json({ error: "No fue posible crear la invitación." }, 409);
  }

  const { error: membershipError } = await admin.from("memberships").insert({
    organization_id: organizationId,
    branch_id: branchId,
    user_id: invited.user.id,
    role,
    active: true,
  });
  if (membershipError) {
    const { error: compensationError } =
      await admin.auth.admin.deleteUser(invited.user.id);
    if (compensationError) {
      console.error("No se pudo compensar el usuario invitado", {
        userId: invited.user.id,
        error: compensationError.message,
      });
    }
    return json({ error: "No fue posible asignar la membresía." }, 500);
  }

  return json({ ok: true }, 201);
});

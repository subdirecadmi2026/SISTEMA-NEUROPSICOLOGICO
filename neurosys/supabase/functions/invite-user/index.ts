import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
      throw new Error("Configuración o autorización incompleta");
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) throw new Error("Sesión inválida");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: actor, error: actorError } = await adminClient
      .from("profiles")
      .select("organization_id, role, is_active")
      .eq("id", authData.user.id)
      .single();

    if (actorError || !actor?.is_active || actor.role !== "Administrador") {
      return Response.json({ error: "Solo un administrador puede invitar usuarios" }, { status: 403, headers: corsHeaders });
    }

    const body = await request.json();
    const { email, fullName, role, serviceId } = body as {
      email: string;
      fullName: string;
      role: "Administrador" | "Supervisor" | "Jefe de enfermería";
      serviceId?: string | null;
    };

    const { data: invitation, error: invitationError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    });
    if (invitationError || !invitation.user) throw invitationError || new Error("No se pudo crear la invitación");

    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        organization_id: actor.organization_id,
        service_id: serviceId || null,
        full_name: fullName,
        role,
        is_active: true,
      })
      .eq("id", invitation.user.id);
    if (profileError) throw profileError;

    return Response.json({ userId: invitation.user.id }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo invitar al usuario";
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }
});

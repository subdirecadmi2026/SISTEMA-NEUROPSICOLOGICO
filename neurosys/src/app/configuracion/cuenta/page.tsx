import { Settings } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { AccountForms } from "./account-forms";

export default async function AccountSettingsPage() {
  let fullName = "Dra. Daniela Romero";
  let email = "daniela.romero@neurosys.demo";

  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      email = user.email ?? "Correo no disponible";
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      fullName = profile?.full_name ?? user.user_metadata.full_name ?? "Usuario NeuroSys";
    }
  }

  return (
    <main className="p-4 sm:p-7 lg:p-9">
      <div className="mb-7 flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
          <Settings size={20} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">
            Configuración
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            Mi cuenta
          </h1>
        </div>
      </div>
      <AccountForms
        initialName={fullName}
        email={email}
        demo={!isSupabaseConfigured}
      />
    </main>
  );
}

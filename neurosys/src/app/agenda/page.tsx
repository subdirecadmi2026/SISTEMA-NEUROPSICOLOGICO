import { AgendaClient } from "@/components/agenda/agenda-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function AgendaPage() {
  return <AgendaClient demoMode={!isSupabaseConfigured} />;
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type CustomizationSettings = {
  brandName: string;
  brandTagline: string;
  organizationName: string;
  branchName: string;
  fullName: string;
  role: string;
};

export type EditableCustomization = Omit<CustomizationSettings, "role">;

type CustomizationContextValue = {
  settings: CustomizationSettings;
  loading: boolean;
  connected: boolean;
  canEditOrganization: boolean;
  save: (values: EditableCustomization) => Promise<void>;
};

const STORAGE_KEY = "neurosys-customization";

export const defaultCustomization: CustomizationSettings = {
  brandName: "NeuroSys",
  brandTagline: "Clinical ERP",
  organizationName: "Centro Ñampi Wasi",
  branchName: "Sede principal",
  fullName: "Dr. Diego Romero",
  role: "Director clínico",
};

const roleLabels: Record<string, string> = {
  super_admin: "Administrador",
  director: "Director clínico",
  clinician: "Profesional clínico",
  assistant: "Asistente clínico",
  receptionist: "Recepción",
  billing: "Facturación",
  auditor: "Auditoría",
};

const CustomizationContext = createContext<CustomizationContextValue | null>(
  null,
);

function readStoredCustomization() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultCustomization;
    return {
      ...defaultCustomization,
      ...(JSON.parse(stored) as Partial<CustomizationSettings>),
    };
  } catch {
    return defaultCustomization;
  }
}

export function CustomizationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] =
    useState<CustomizationSettings>(defaultCustomization);
  const [loading, setLoading] = useState(true);
  const [ids, setIds] = useState<{
    userId: string;
    organizationId: string;
    branchId: string;
  } | null>(null);
  const [canEditOrganization, setCanEditOrganization] = useState(
    !isSupabaseConfigured,
  );

  useEffect(() => {
    let active = true;

    async function load() {
      if (!isSupabaseConfigured) {
        if (active) {
          setSettings(readStoredCustomization());
          setLoading(false);
        }
        return;
      }

      const supabase = createClient();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) setLoading(false);
        return;
      }

      const { data: membership } = await supabase
        .from("memberships")
        .select("organization_id, branch_id, role")
        .eq("user_id", user.id)
        .eq("active", true)
        .not("branch_id", "is", null)
        .limit(1)
        .maybeSingle();

      if (!membership?.branch_id) {
        if (active) setLoading(false);
        return;
      }

      const [organizationResult, branchResult, profileResult] =
        await Promise.all([
          supabase
            .from("organizations")
            .select("trade_name, brand_name, brand_tagline")
            .eq("id", membership.organization_id)
            .single(),
          supabase
            .from("branches")
            .select("name")
            .eq("id", membership.branch_id)
            .single(),
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single(),
        ]);

      if (!active) return;
      setIds({
        userId: user.id,
        organizationId: membership.organization_id,
        branchId: membership.branch_id,
      });
      setCanEditOrganization(
        membership.role === "super_admin" || membership.role === "director",
      );
      setSettings({
        brandName:
          organizationResult.data?.brand_name ??
          defaultCustomization.brandName,
        brandTagline:
          organizationResult.data?.brand_tagline ??
          defaultCustomization.brandTagline,
        organizationName:
          organizationResult.data?.trade_name ??
          defaultCustomization.organizationName,
        branchName:
          branchResult.data?.name ?? defaultCustomization.branchName,
        fullName:
          profileResult.data?.full_name ?? defaultCustomization.fullName,
        role: roleLabels[membership.role] ?? "Profesional clínico",
      });
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function save(values: EditableCustomization) {
    const next = { ...values, role: settings.role };

    if (!isSupabaseConfigured) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSettings(next);
      return;
    }

    const supabase = createClient();
    if (!supabase || !ids) {
      throw new Error("No fue posible cargar tu espacio de trabajo.");
    }

    const updates = [
      supabase
        .from("profiles")
        .update({ full_name: values.fullName })
        .eq("id", ids.userId),
    ];

    if (canEditOrganization) {
      updates.push(
        supabase
          .from("organizations")
          .update({
            trade_name: values.organizationName,
            brand_name: values.brandName,
            brand_tagline: values.brandTagline,
          })
          .eq("id", ids.organizationId),
        supabase
          .from("branches")
          .update({ name: values.branchName })
          .eq("id", ids.branchId),
      );
    }

    const results = await Promise.all(updates);
    const error = results.find((result) => result.error)?.error;
    if (error) throw error;

    setSettings({
      ...next,
      ...(canEditOrganization
        ? {}
        : {
            brandName: settings.brandName,
            brandTagline: settings.brandTagline,
            organizationName: settings.organizationName,
            branchName: settings.branchName,
          }),
    });
  }

  return (
    <CustomizationContext.Provider
      value={{
        settings,
        loading,
        connected: isSupabaseConfigured,
        canEditOrganization,
        save,
      }}
    >
      {children}
    </CustomizationContext.Provider>
  );
}

export function useCustomization() {
  const context = useContext(CustomizationContext);
  if (!context) {
    throw new Error(
      "useCustomization debe usarse dentro de CustomizationProvider.",
    );
  }
  return context;
}

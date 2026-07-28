import type { Role } from "@/types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  caja: "Caja",
  cocina: "Cocina",
  inventario: "Inventario",
};

export const ALL_ROLES: Role[] = [
  "admin",
  "supervisor",
  "caja",
  "cocina",
  "inventario",
];

type NavItem = {
  href: string;
  label: string;
  roles: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    roles: ["admin", "supervisor", "caja", "inventario"],
  },
  {
    href: "/pos",
    label: "POS",
    roles: ["admin", "supervisor", "caja"],
  },
  {
    href: "/kds",
    label: "KDS Cocina",
    roles: ["admin", "supervisor", "cocina"],
  },
  {
    href: "/catalogo",
    label: "Catálogo",
    roles: ["admin", "supervisor"],
  },
  {
    href: "/recetas",
    label: "Recetas",
    roles: ["admin", "supervisor", "inventario", "cocina"],
  },
  {
    href: "/inventario",
    label: "Inventario",
    roles: ["admin", "supervisor", "inventario"],
  },
  {
    href: "/compras",
    label: "Compras",
    roles: ["admin", "supervisor", "inventario"],
  },
  {
    href: "/caja",
    label: "Caja",
    roles: ["admin", "supervisor", "caja"],
  },
  {
    href: "/reportes",
    label: "Reportes",
    roles: ["admin", "supervisor"],
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    roles: ["admin"],
  },
  {
    href: "/ayuda",
    label: "Ayuda",
    roles: ["admin", "supervisor", "caja", "cocina", "inventario"],
  },
];

export function canAccess(role: Role, href: string) {
  const item = NAV_ITEMS.find((n) => n.href === href);
  if (!item) return true;
  return item.roles.includes(role);
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "cocina":
      return "/kds";
    case "caja":
      return "/pos";
    case "inventario":
      return "/inventario";
    default:
      return "/";
  }
}

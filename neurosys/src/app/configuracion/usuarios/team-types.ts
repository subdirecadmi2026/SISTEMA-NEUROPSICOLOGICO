export const roles = [
  "super_admin",
  "director",
  "clinical_director",
  "reception",
  "professional",
  "cashier",
  "accounting",
  "inventory",
  "patient",
] as const;

export type AppRole = (typeof roles)[number];
export type TeamMember = {
  id: string;
  userId: string;
  organizationId: string;
  organizationName: string;
  name: string;
  role: AppRole;
  active: boolean;
  isCurrentUser: boolean;
};
export type TeamBranch = {
  id: string;
  name: string;
};
export type TeamData = {
  organizationId: string;
  organizationName: string;
  canManage: boolean;
  managerRole: AppRole;
  branches: TeamBranch[];
  members: TeamMember[];
};
export type TeamDataResult =
  | { status: "ok"; data: TeamData }
  | { status: "unauthorized" | "forbidden" | "error"; message: string };
export type TeamActionResult = { ok: boolean; message: string };

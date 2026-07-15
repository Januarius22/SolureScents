export const applicationRoles = [
  "customer",
  "publisher",
  "inventory_manager",
  "customer_support",
  "sales_manager",
  "administrator",
  "super_admin",
] as const;

export type ApplicationRole = (typeof applicationRoles)[number];
export type ApplicationArea = "account" | "admin" | "publisher";

export interface UserAccess {
  email: string;
  id: string;
  roles: ApplicationRole[];
  status: "active" | "suspended" | "deactivated";
}

export interface AuthActionState {
  fieldErrors?: Partial<Record<"email" | "fullName" | "password" | "passwordConfirmation", string[]>>;
  message?: string;
  status: "idle" | "error" | "success";
}

export const initialAuthActionState: AuthActionState = { status: "idle" };

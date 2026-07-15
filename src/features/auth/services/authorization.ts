import { redirect } from "next/navigation";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  applicationRoles,
  type ApplicationArea,
  type ApplicationRole,
  type UserAccess,
} from "@/features/auth/types/auth";

const rolesSchema = z.array(z.enum(applicationRoles));
const profileSchema = z.object({
  status: z.enum(["active", "suspended", "deactivated"]),
});

const adminRoles = new Set<ApplicationRole>([
  "inventory_manager",
  "customer_support",
  "sales_manager",
  "administrator",
  "super_admin",
]);

/** Maps a user's highest-privilege active role to its isolated application. */
export function resolveApplicationArea(roles: readonly ApplicationRole[]): ApplicationArea {
  if (roles.some((role) => adminRoles.has(role))) {
    return "admin";
  }

  if (roles.includes("publisher")) {
    return "publisher";
  }

  return "account";
}

/** Returns the canonical application root for a role set. */
export function resolveRoleHome(roles: readonly ApplicationRole[]): `/${ApplicationArea}` {
  return `/${resolveApplicationArea(roles)}`;
}

/** Loads a verified user plus database-backed roles and account status. */
export async function getCurrentUserAccess(): Promise<UserAccess | null> {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const [rolesResult, profileResult] = await Promise.all([
    supabase.rpc("current_user_roles"),
    supabase.from("profiles").select("status").eq("id", userData.user.id).single(),
  ]);

  if (rolesResult.error) {
    throw new Error("Unable to load account roles.", { cause: rolesResult.error });
  }

  if (profileResult.error) {
    throw new Error("Unable to load account status.", { cause: profileResult.error });
  }

  return {
    email: userData.user.email ?? "",
    id: userData.user.id,
    roles: rolesSchema.parse(rolesResult.data),
    status: profileSchema.parse(profileResult.data).status,
  };
}

/** Enforces authentication, account status, and application-level authorization server-side. */
export async function requireApplicationAccess(area: ApplicationArea): Promise<UserAccess> {
  const access = await getCurrentUserAccess();

  if (!access) {
    redirect(`/login?next=/${area}`);
  }

  if (access.status !== "active") {
    redirect("/login?reason=account_unavailable");
  }

  const assignedArea = resolveApplicationArea(access.roles);
  if (assignedArea !== area) {
    redirect(`/${assignedArea}`);
  }

  return access;
}

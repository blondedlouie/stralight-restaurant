import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export type StaffRole = "super_admin" | "branch_manager" | "dispatch" | "kitchen" | "rider" | "pos";
const roles: StaffRole[] = ["super_admin", "branch_manager", "dispatch", "kitchen", "rider", "pos"];

export function getStaffContext(request: Request) {
  const roleValue = request.headers.get("x-starlight-role") as StaffRole | null;
  return {
    role: roleValue && roles.includes(roleValue) ? roleValue : null,
    userId: request.headers.get("x-starlight-user-id"),
    branchId: request.headers.get("x-starlight-branch-id"),
    sandbox: request.headers.get("x-starlight-sandbox") === "true",
  };
}

export function requireStaffRole(request: Request, allowed: StaffRole[]) {
  const context = getStaffContext(request);
  if (!context.role || !allowed.includes(context.role)) {
    return { context, response: NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 }) };
  }
  return { context, response: null };
}

export function getServiceDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

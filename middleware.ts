import { NextRequest, NextResponse } from "next/server";

type Role = "super_admin" | "branch_manager" | "dispatch" | "kitchen" | "rider" | "pos";

const routeRoles: Record<string, Role[]> = {
  "/admin/super": ["super_admin"],
  "/admin/dispatch": ["super_admin", "branch_manager", "dispatch"],
  "/admin/kds": ["super_admin", "branch_manager", "kitchen"],
  "/admin/kitchen": ["super_admin", "branch_manager", "kitchen"],
  "/admin/rider": ["super_admin", "rider"],
  "/admin/pos": ["super_admin", "branch_manager", "pos"],
};

const validRoles: Role[] = ["super_admin", "branch_manager", "dispatch", "kitchen", "rider", "pos"];
const sandboxEnabled = process.env.NEXT_PUBLIC_ENABLE_SANDBOX === "true";
const mockEnabled = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" && process.env.NODE_ENV !== "production";

function requiredRoles(pathname: string) {
  if (/^\/api\/orders\/track\/[^/]+\/verify$/.test(pathname)) return ["super_admin", "rider"] as Role[];
  const route = Object.keys(routeRoles).find((key) => pathname === key || pathname.startsWith(`${key}/`));
  if (route) return routeRoles[route];
  if (pathname.startsWith("/api/admin")) return ["super_admin", "branch_manager", "dispatch", "kitchen", "rider", "pos"] as Role[];
  return ["super_admin", "branch_manager", "dispatch", "kitchen", "rider", "pos"] as Role[];
}

function makeAuthUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base.replace(/\/$/, "")}${path}` : null;
}

async function verifyAccessToken(token: string, anonKey: string) {
  const url = makeAuthUrl("/auth/v1/user");
  if (!url) return null;
  const response = await fetch(url, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` }, cache: "no-store" });
  return response.ok ? response.json() as Promise<{ id: string }> : null;
}

async function refreshTokens(refreshToken: string, anonKey: string) {
  const url = makeAuthUrl("/auth/v1/token?grant_type=refresh_token");
  if (!url) return null;
  const response = await fetch(url, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number; user: { id: string } }>;
}

async function getProfile(userId: string, serviceKey: string) {
  const url = makeAuthUrl(`/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&select=role,branch_id,is_active&limit=1`);
  if (!url) return null;
  const response = await fetch(url, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" });
  if (!response.ok) return null;
  const profiles = await response.json() as Array<{ role: Role; branch_id: string | null; is_active: boolean }>;
  return profiles[0] && profiles[0].is_active ? profiles[0] : null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (pathname.startsWith("/api/sandbox/")) {
    if (sandboxEnabled) return NextResponse.next();
    return NextResponse.json({ error: "Sandbox is disabled." }, { status: 404 });
  }
  if (pathname === "/admin/login") return NextResponse.next();

  if (sandboxEnabled && mockEnabled) {
    const mockRole = request.cookies.get("starlight-sandbox-role")?.value as Role | undefined;
    if (mockRole && validRoles.includes(mockRole)) {
      const allowedMock = requiredRoles(pathname).includes(mockRole);
      if (!allowedMock) return isApi ? NextResponse.json({ error: "Your mock role cannot access this resource." }, { status: 403 }) : NextResponse.redirect(new URL("/admin/forbidden", request.url));
      const headers = new Headers(request.headers);
      headers.set("x-starlight-role", mockRole);
      headers.set("x-starlight-user-id", `mock-${mockRole}`);
      headers.set("x-starlight-branch-id", "mock-south-c");
      headers.set("x-starlight-sandbox", "true");
      headers.set("x-starlight-mock", "true");
      return NextResponse.next({ request: { headers } });
    }
    if (pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/")) return isApi ? NextResponse.json({ error: "Choose a mock staff role first." }, { status: 401 }) : NextResponse.redirect(new URL("/admin/login", request.url));
  }

  let role: Role | null = null;
  let branchId: string | null = null;
  let userId: string | null = null;
  let refreshed: { access_token: string; refresh_token: string; expires_in: number } | null = null;

  if (sandboxEnabled) {
    const previewRole = request.cookies.get("starlight-sandbox-role")?.value as Role | undefined;
    if (previewRole && validRoles.includes(previewRole)) role = previewRole;
  }

  if (!role) {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let accessToken = request.cookies.get("starlight-access-token")?.value;
    let refreshToken = request.cookies.get("starlight-refresh-token")?.value;
    if (anonKey && serviceKey && accessToken) {
      try {
        let user = await verifyAccessToken(accessToken, anonKey);
        if (!user && refreshToken) {
          const session = await refreshTokens(refreshToken, anonKey);
          if (session) {
            accessToken = session.access_token;
            refreshToken = session.refresh_token;
            refreshed = session;
            user = session.user;
          }
        }
        if (user) {
          userId = user.id;
          const profile = await getProfile(user.id, serviceKey);
          if (profile) {
            role = profile.role;
            branchId = profile.branch_id;
          }
        }
      } catch {
        role = null;
      }
    }
  }

  const allowed = role && requiredRoles(pathname).includes(role);
  if (!allowed) {
    if (isApi) return NextResponse.json({ error: role ? "Your staff role cannot access this resource." : "Staff sign-in required." }, { status: role ? 403 : 401 });
    const destination = role ? "/admin/forbidden" : `/admin/login?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(new URL(destination, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-starlight-role", role!);
  if (userId) requestHeaders.set("x-starlight-user-id", userId);
  if (branchId) requestHeaders.set("x-starlight-branch-id", branchId);
  if (sandboxEnabled && !userId) requestHeaders.set("x-starlight-sandbox", "true");
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (refreshed) {
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: Math.max(60, refreshed.expires_in) };
    response.cookies.set("starlight-access-token", refreshed.access_token, options);
    response.cookies.set("starlight-refresh-token", refreshed.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/sandbox/:path*", "/api/orders/track/:id/verify"],
};

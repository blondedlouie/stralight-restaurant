import { NextResponse } from "next/server";
import { getServiceDatabase, type StaffRole } from "@/lib/admin/server";
import { mockStaff } from "@/lib/mock-data";
const mockOn=()=>process.env.NEXT_PUBLIC_ENABLE_SANDBOX==="true"&&process.env.NEXT_PUBLIC_USE_MOCK_DATA==="true"&&process.env.NODE_ENV!=="production";
const staffRoles: StaffRole[] = ["super_admin", "branch_manager", "dispatch", "kitchen", "rider", "pos"];
export async function GET(request:Request){if(mockOn()){const cookie=request.headers.get("cookie")||"";const role=decodeURIComponent(cookie.split(";").map(value=>value.trim()).find(value=>value.startsWith("starlight-sandbox-role="))?.split("=")[1]||"");return NextResponse.json({user:mockStaff.find(s=>s.role===role)||null});}return NextResponse.json({user:null});}

export async function POST(request: Request) {
  if(mockOn()){const body=await request.json().catch(()=>null) as {role?:string}|null;const staff=mockStaff.find(s=>s.role===body?.role);if(!staff)return NextResponse.json({error:"Unknown mock role."},{status:400});const response=NextResponse.json({success:true,user:staff});response.cookies.set("starlight-sandbox-role",staff.role,{httpOnly:true,sameSite:"lax",path:"/",maxAge:28800});return response;}
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!anonKey || !baseUrl) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });

  const body = await request.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!body?.access_token || !body.refresh_token) return NextResponse.json({ error: "A valid session is required." }, { status: 400 });

  const verification = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${body.access_token}` },
    cache: "no-store",
  });
  if (!verification.ok) return NextResponse.json({ error: "The Supabase session could not be verified." }, { status: 401 });
  const user = await verification.json() as { id?: string };
  if (!user.id) return NextResponse.json({ error: "Supabase did not return a user for this session." }, { status: 401 });

  const database = getServiceDatabase();
  if (!database) return NextResponse.json({ error: "Staff verification is not configured. Check the Supabase URL and server-only service role key in Vercel, then redeploy." }, { status: 503 });
  const { data: profile, error: profileError } = await database
    .from("user_profiles")
    .select("role,is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Staff profile lookup failed during sign-in", profileError.message);
    return NextResponse.json({ error: "Could not verify your staff profile. Check the deployment logs or database configuration." }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Your credentials are valid, but this account has no staff profile in the Supabase project connected to this deployment." }, { status: 403 });
  }
  if (!profile.is_active || !staffRoles.includes(profile.role as StaffRole)) {
    return NextResponse.json({ error: "Your staff profile is inactive or has an unsupported role. Ask an administrator to check user_profiles." }, { status: 403 });
  }

  const response = NextResponse.json({ success: true, role: profile.role });
  const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set("starlight-access-token", body.access_token, { ...cookieOptions, maxAge: Math.min(Math.max(body.expires_in || 3600, 60), 3600) });
  response.cookies.set("starlight-refresh-token", body.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("starlight-sandbox-role","",{httpOnly:true,path:"/",maxAge:0});
  response.cookies.set("starlight_simulation_mode", "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set("starlight_simulation_role", "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set("starlight_simulation_branch", "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set("starlight-access-token", "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set("starlight-refresh-token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

import {NextResponse} from "next/server";
import {mockMode,resetMockState} from "@/lib/mock-data";
export async function POST(){if(!mockMode())return NextResponse.json({error:"Local mock mode is disabled. Set NEXT_PUBLIC_ENABLE_SANDBOX=true and NEXT_PUBLIC_USE_MOCK_DATA=true."},{status:404});resetMockState();return NextResponse.json({success:true});}

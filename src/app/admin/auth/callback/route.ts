import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "/admin";
  const safeNext = next.startsWith("/admin") ? next : "/admin";
  if (code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(safeNext, req.url));
}

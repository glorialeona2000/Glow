import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_COOKIE, previewToken } from "@/lib/launch";

/** /apercu?code=… active l'aperçu du site ; /apercu?quitter=1 le désactive. */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.url));
  if (req.nextUrl.searchParams.has("quitter")) {
    res.cookies.delete(PREVIEW_COOKIE);
    return res;
  }
  const code = req.nextUrl.searchParams.get("code") ?? "";
  if (code === previewToken()) {
    res.cookies.set(PREVIEW_COOKIE, code, {
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }
  return res;
}

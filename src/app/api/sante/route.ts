import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Diagnostic de configuration : n'affiche jamais de valeur secrète, seulement leur présence. */
export async function GET() {
  const env = (k: string) => (process.env[k] ? "ok" : "MANQUANTE");
  const url = process.env.DATABASE_URL ?? "";
  let host = "";
  let port = "";
  let user = "";
  try {
    const u = new URL(url);
    host = u.hostname;
    port = u.port;
    user = u.username.replace(/\..*/, ".***");
  } catch {
    host = url ? "adresse illisible (format incorrect)" : "";
  }
  let database = "ok";
  let detail = "";
  try {
    const sql = db();
    // plusieurs requêtes simultanées, comme sur les vraies pages
    const [[r], [c], [h]] = await Promise.all([
      sql<{ n: number }[]>`select count(*)::int as n from services`,
      sql<{ n: number }[]>`select count(*)::int as n from categories`,
      sql<{ n: number }[]>`select count(*)::int as n from working_hours`,
    ]);
    detail = `${r.n} prestations, ${c.n} catégories, ${h.n} plages horaires`;
  } catch (e) {
    database = "ERREUR";
    const err = e as { code?: string; message?: string };
    detail = `${err.code ?? ""} ${(err.message ?? "").replace(/postgres(ql)?:\/\/[^\s]+/g, "[adresse masquée]")}`.slice(0, 300);
  }
  return NextResponse.json(
    {
      base_de_donnees: database,
      detail,
      connexion: { hote: host, port, utilisateur: user, crochets_restants: url.includes("[") || url.includes("]") },
      variables: {
        DATABASE_URL: env("DATABASE_URL"),
        NEXT_PUBLIC_SUPABASE_URL: env("NEXT_PUBLIC_SUPABASE_URL"),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
        RESEND_API_KEY: env("RESEND_API_KEY"),
        APP_SECRET: env("APP_SECRET"),
        CRON_SECRET: env("CRON_SECRET"),
        SITE_URL: env("SITE_URL"),
        ADMIN_EMAILS: env("ADMIN_EMAILS"),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

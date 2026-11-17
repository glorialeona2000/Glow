"use server";

import { redirect } from "next/navigation";
import { adminEmails, supabaseServer } from "@/lib/auth";
import type { FormState } from "@/lib/form";

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "E-mail et mot de passe requis." };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { error: "Supabase n’est pas encore configuré." };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    await new Promise((r) => setTimeout(r, 600)); // ralentit les essais en série
    return { error: "Identifiants incorrects." };
  }
  if (!adminEmails().includes((data.user.email ?? "").toLowerCase())) {
    await supabase.auth.signOut();
    return { error: "Ce compte n’a pas accès à l’administration." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function requestPasswordReset(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Indiquez votre e-mail." };
  if (adminEmails().includes(email)) {
    const supabase = await supabaseServer();
    const site = (process.env.SITE_URL || "").replace(/\/$/, "");
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${site}/admin/auth/callback?next=/admin/mot-de-passe` });
  }
  return { ok: "Si ce compte existe, un e-mail de réinitialisation vient d’être envoyé." };
}

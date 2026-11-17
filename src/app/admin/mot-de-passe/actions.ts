"use server";
import { requireAdmin, supabaseServer } from "@/lib/auth";
import type { FormState } from "@/lib/form";

export async function updatePassword(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const pw = String(fd.get("password") ?? "");
  if (pw.length < 12) return { error: "12 caractères minimum." };
  if (pw !== String(fd.get("confirm") ?? "")) return { error: "Les mots de passe ne correspondent pas." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return { error: error.message };
  return { ok: "Mot de passe mis à jour." };
}

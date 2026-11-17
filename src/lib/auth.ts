import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // appelé depuis un Server Component : le proxy se charge du rafraîchissement
        }
      },
    },
  });
}

/** Utilisatrice connectée ET autorisée (liste ADMIN_EMAILS), sinon null. */
export async function getAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser(); // vérifié auprès de Supabase Auth
  if (error || !data.user?.email) return null;
  if (!adminEmails().includes(data.user.email.toLowerCase())) return null;
  return { id: data.user.id, email: data.user.email };
}

/** À appeler en tête de chaque page et action de l'admin. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

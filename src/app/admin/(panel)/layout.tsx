import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Flash } from "@/components/admin/Flash";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { signOut } from "../login/actions";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin BELAVICA" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const flash = (await cookies()).get("admin_flash")?.value ?? null;
  const [{ pending }] = await db()<{ pending: number }[]>`select count(*)::int as pending from bookings where status = 'pending'`;
  return (
    <div className="min-h-dvh bg-cream">
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-ink text-ivory">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link href="/admin" className="wordmark text-base">Belavica</Link>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/" target="_blank" className="hidden text-ivory/70 hover:text-ivory sm:inline">Voir le site ↗</Link>
            <span className="hidden text-ivory/50 md:inline">{admin.email}</span>
            <form action={signOut}>
              <button className="text-ivory/80 underline-offset-4 hover:underline">Déconnexion</button>
            </form>
          </div>
        </div>
        <AdminNav pending={pending} />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <Flash key={flash ?? "none"} raw={flash} />
        {children}
      </main>
    </div>
  );
}

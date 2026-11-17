import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center text-ivory">
          <Image src="/brand/emblem-ivory.webp" alt="" width={72} height={107} className="mx-auto h-auto w-16" priority />
          <p className="wordmark mt-6 text-2xl">Belavica</p>
          <p className="eyebrow mt-2 text-ivory/60">Espace administrateur</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

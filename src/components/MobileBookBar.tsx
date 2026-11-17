"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Bouton « Réserver » toujours accessible au pouce sur mobile. */
export function MobileBookBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/reservation") || pathname.startsWith("/rdv")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-ivory/95 px-4 pt-3 pb-safe backdrop-blur-md md:hidden">
      <Link href="/reservation" className="btn btn-primary w-full">
        Réserver un rendez-vous
      </Link>
    </div>
  );
}

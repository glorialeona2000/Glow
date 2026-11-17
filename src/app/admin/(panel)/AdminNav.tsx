"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Tableau de bord", exact: true },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/reservations", label: "Réservations" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/prestations", label: "Prestations" },
  { href: "/admin/disponibilites", label: "Disponibilités" },
  { href: "/admin/site", label: "Site" },
  { href: "/admin/parametres", label: "Paramètres" },
];

export function AdminNav({ pending }: { pending: number }) {
  const path = usePathname();
  return (
    <nav className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 md:px-4" aria-label="Administration">
      {ITEMS.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`relative shrink-0 px-3 py-3 text-[0.68rem] tracking-[0.16em] uppercase whitespace-nowrap transition-colors ${
              active ? "text-ivory" : "text-ivory/55 hover:text-ivory"
            }`}
          >
            {i.label}
            {i.href === "/admin/reservations" && pending > 0 && (
              <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-champagne px-1.5 text-[0.6rem] text-ink">
                {pending}
              </span>
            )}
            {active && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-champagne-light" />}
          </Link>
        );
      })}
    </nav>
  );
}

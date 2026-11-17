"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { InstagramIcon } from "./icons";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/prestations", label: "Prestations" },
  { href: "/#galerie", label: "Réalisations" },
  { href: "/#a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ instagram }: { instagram: string }) {
  const pathname = usePathname();
  // le menu se referme automatiquement au changement de page
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const [scrolled, setScrolled] = useState(false);
  const overHero = pathname === "/" && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-500 ${
        overHero ? "bg-transparent text-ivory" : "bg-ivory/95 text-ink backdrop-blur-md border-b border-ink/5"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:h-20 md:px-8">
        <Link href="/" className="wordmark text-[1.05rem] md:text-xl" aria-label="BELAVICA, accueil">
          Belavica
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navigation principale">
          {NAV.slice(1).map((n) => (
            <Link key={n.href} href={n.href} className="eyebrow link-underline py-1">
              {n.label}
            </Link>
          ))}
          <Link href="/reservation" className={`btn ${overHero ? "btn-light" : "btn-primary"} min-h-11 px-5`}>
            Réserver
          </Link>
        </nav>
        <button
          type="button"
          className="relative -mr-2 flex size-11 items-center justify-center md:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          onClick={() => setOpenOn(open ? null : pathname)}
        >
          <span className={`absolute h-px w-6 bg-current transition-transform duration-500 ${open ? "rotate-45" : "-translate-y-[4px]"}`} />
          <span className={`absolute h-px w-6 bg-current transition-transform duration-500 ${open ? "-rotate-45" : "translate-y-[4px]"}`} />
        </button>
      </div>

      <div
        className={`fixed inset-x-0 top-16 bottom-0 bg-ivory text-ink transition-[opacity,visibility] duration-500 md:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <nav className="flex h-full flex-col px-6 pt-10 pb-safe" aria-label="Menu mobile">
          {NAV.map((n, i) => (
            <Link
              key={n.href}
              href={n.href}
              className="display border-b border-ink/10 py-4 text-3xl"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {n.label}
            </Link>
          ))}
          <div className="mt-auto space-y-4 pb-6">
            <Link href="/reservation" className="btn btn-primary w-full">
              Réserver un rendez-vous
            </Link>
            <a
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline w-full"
            >
              <InstagramIcon className="size-4" /> @{instagram}
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}

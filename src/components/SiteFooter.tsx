import Image from "next/image";
import Link from "next/link";
import { InstagramIcon } from "./icons";
import type { SiteContent } from "@/lib/content";

export function SiteFooter({ content }: { content: SiteContent }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink pb-28 text-ivory md:pb-0">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="flex items-start gap-5">
            <Image src="/brand/emblem-ivory.webp" alt="" width={56} height={83} className="h-auto w-12 opacity-90" />
            <div>
              <p className="wordmark text-xl">Belavica</p>
              <p className="eyebrow mt-2 text-ivory/60">Beauty Studio</p>
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-ivory/65">{content.city}<br />{content.hours_notice}</p>
            </div>
          </div>
          <div>
            <p className="eyebrow text-ivory/50">Le studio</p>
            <ul className="mt-5 space-y-3 text-sm">
              <li><Link className="link-underline" href="/prestations">Prestations & tarifs</Link></li>
              <li><Link className="link-underline" href="/reservation">Réserver en ligne</Link></li>
              <li><Link className="link-underline" href="/#galerie">Réalisations</Link></li>
              <li><Link className="link-underline" href="/contact">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow text-ivory/50">Suivre</p>
            <a
              href={`https://instagram.com/${content.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-3 text-sm"
            >
              <InstagramIcon className="size-5" />
              <span className="link-underline">@{content.instagram_handle}</span>
            </a>
          </div>
        </div>
        <div className="hairline mt-14" />
        <div className="mt-6 flex flex-col gap-3 text-xs text-ivory/50 md:flex-row md:items-center md:justify-between">
          <p>© {year} {content.legal_name || "Belavica"} · Tous droits réservés</p>
          <div className="flex gap-6">
            <Link className="link-underline" href="/confidentialite">Confidentialité</Link>
            <Link className="link-underline" href="/mentions-legales">Mentions légales</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

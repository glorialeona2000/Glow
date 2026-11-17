import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileBookBar } from "@/components/MobileBookBar";
import { RevealObserver } from "@/components/Reveal";
import { ComingSoon } from "@/components/ComingSoon";
import { getContent } from "@/lib/data";
import { comingSoonEnabled, isLockedForVisitor } from "@/lib/launch";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // Tant que le site n'est pas lancé, il n'est pas indexé par les moteurs de recherche
  return (await comingSoonEnabled()) ? { robots: { index: false, follow: false } } : {};
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [content, locked, soon] = await Promise.all([getContent(), isLockedForVisitor(), comingSoonEnabled()]);
  if (locked) return <ComingSoon instagram={content.instagram_handle} city={content.city} />;
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
        Aller au contenu
      </a>
      {soon && (
        <div className="fixed bottom-[5.5rem] left-3 z-50 rounded-full bg-champagne px-3 py-1.5 text-[0.6rem] tracking-[0.16em] text-ink uppercase shadow-md md:bottom-4">
          Aperçu privé ·{" "}
          <a href="/apercu?quitter=1" className="underline">
            quitter
          </a>
        </div>
      )}
      <SiteHeader instagram={content.instagram_handle} />
      <main id="contenu">{children}</main>
      <SiteFooter content={content} />
      <MobileBookBar />
      <RevealObserver />
    </>
  );
}

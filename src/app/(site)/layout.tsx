import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileBookBar } from "@/components/MobileBookBar";
import { RevealObserver } from "@/components/Reveal";
import { getContent } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const content = await getContent();
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
        Aller au contenu
      </a>
      <SiteHeader instagram={content.instagram_handle} />
      <main id="contenu">{children}</main>
      <SiteFooter content={content} />
      <MobileBookBar />
      <RevealObserver />
    </>
  );
}

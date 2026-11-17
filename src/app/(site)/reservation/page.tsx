import type { Metadata } from "next";
import { getCatalog, getContent, getSettings, servicePricing } from "@/lib/data";
import { fill } from "@/lib/content";
import { formatPrice } from "@/lib/money";
import { BookingWizard, type WizardCategory } from "./BookingWizard";

export const metadata: Metadata = {
  title: "Réserver un rendez-vous",
  description: "Réservez en ligne votre rendez-vous chez BELAVICA Beauty Studio à Arlon.",
};

export default async function ReservationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [catalog, content, settings] = await Promise.all([getCatalog(), getContent(), getSettings()]);
  const vars = { acompte: formatPrice(settings.deposit_cents), delai: `${settings.cancellation_hours} heures` };

  const categories: WizardCategory[] = catalog
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      tagline: c.tagline,
      image_url: c.image_url,
      services: c.services.map((s) => {
        const p = servicePricing(s);
        return {
          id: s.id,
          name: s.name,
          description: s.description,
          highlights: s.highlights,
          note: s.note,
          booking_mode: s.booking_mode,
          requires_deposit: s.requires_deposit,
          price_cents: s.price_cents,
          duration_min: s.duration_min,
          bookable: p.bookable,
          variants: s.variants
            .filter((v) => v.price_cents != null && v.duration_min != null)
            .map((v) => ({ id: v.id, name: v.name, description: v.description, price_cents: v.price_cents!, duration_min: v.duration_min! })),
          options: s.options.map((o) => ({ id: o.id, name: o.name, description: o.description, price_cents: o.price_cents ?? 0, duration_min: o.duration_min })),
        };
      }),
    }))
    .filter((c) => c.services.length > 0);

  const pre = typeof sp.prestation === "string" ? sp.prestation : undefined;
  const preCat = typeof sp.categorie === "string" ? sp.categorie : undefined;

  return (
    <div className="min-h-dvh bg-ivory pt-16 md:pt-20">
      <BookingWizard
        categories={categories}
        initialServiceId={pre}
        initialCategorySlug={preCat}
        texts={{
          deposit: settings.deposit_enabled ? fill(content.deposit_text, vars) : "",
          cancellation: fill(content.cancellation_text, vars),
          address: content.address_notice,
          requestDone: content.request_text,
          instagram: content.instagram_handle,
        }}
        depositCents={settings.deposit_enabled ? settings.deposit_cents : 0}
        turnstileSiteKey={process.env.TURNSTILE_SECRET_KEY ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null : null}
      />
    </div>
  );
}

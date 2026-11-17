import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCatalog, getContent, getSettings, servicePricing } from "@/lib/data";
import { fill } from "@/lib/content";
import { formatPrice } from "@/lib/money";
import { formatDuration } from "@/lib/time";
import { PageHero } from "@/components/PageHero";
import { ArrowRight, Clock } from "@/components/icons";

export const metadata: Metadata = {
  title: "Prestations & tarifs",
  description: "Make-up, Lash & Brow, Nails et soins du visage personnalisés à Arlon : découvrez les prestations et tarifs BELAVICA.",
};

export default async function PrestationsPage() {
  const [catalog, content, settings] = await Promise.all([getCatalog(), getContent(), getSettings()]);
  const vars = { acompte: formatPrice(settings.deposit_cents), delai: `${settings.cancellation_hours} heures` };

  return (
    <>
      <PageHero eyebrow="Carte des soins" title="Prestations">
        Chaque prestation est réalisée sur rendez-vous, avec le plus grand soin, dans un cadre intimiste à Arlon.
      </PageHero>

      <nav className="sticky top-16 z-20 border-b border-ink/10 bg-ivory/95 backdrop-blur-md md:top-20" aria-label="Catégories">
        <div className="no-scrollbar mx-auto flex max-w-6xl gap-7 overflow-x-auto px-5 md:justify-center md:px-8">
          {catalog.map((c) => (
            <a key={c.id} href={`#${c.slug}`} className="eyebrow shrink-0 py-4 whitespace-nowrap text-taupe hover:text-ink">
              {c.name}
            </a>
          ))}
        </div>
      </nav>

      {catalog.map((c, ci) => (
        <section key={c.id} id={c.slug} className={`scroll-mt-32 py-16 md:scroll-mt-40 md:py-24 ${ci % 2 ? "bg-cream" : ""}`}>
          <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-16 md:px-8">
            <div className="reveal md:sticky md:top-40 md:self-start">
              {c.image_url && (
                <div className="arch relative mb-8 hidden aspect-[3/4] w-full max-w-xs bg-sand md:block">
                  <Image src={c.image_url} alt="" fill sizes="30vw" className="object-cover" />
                </div>
              )}
              <p className="eyebrow text-champagne">{c.tagline}</p>
              <h2 className="display mt-3 text-4xl md:text-5xl">{c.name}</h2>
              <p className="mt-5 max-w-sm leading-relaxed text-taupe">{c.description}</p>
            </div>

            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {c.services.map((s) => {
                const p = servicePricing(s);
                return (
                  <li key={s.id} className="reveal py-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-10">
                      <div className="min-w-0 flex-1">
                        <h3 className="display text-2xl leading-snug">{s.name}</h3>
                        <p className="mt-3 leading-relaxed text-taupe">{s.description}</p>
                        {s.highlights.length > 0 && (
                          <ul className="mt-5 space-y-2.5 text-sm text-taupe">
                            {s.highlights.map((h) => {
                              const [title, ...rest] = h.split(" : ");
                              return (
                                <li key={h} className="flex gap-3">
                                  <span className="mt-2 size-1 shrink-0 rounded-full bg-champagne" />
                                  <span>
                                    {rest.length ? (
                                      <>
                                        <strong className="font-medium text-ink">{title}</strong> : {rest.join(" : ")}
                                      </>
                                    ) : (
                                      h
                                    )}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {s.note && <p className="mt-5 border-l-2 border-champagne/60 pl-4 text-sm italic leading-relaxed text-taupe">{s.note}</p>}
                        {s.variants.length > 0 && (
                          <ul className="mt-5 space-y-2 text-sm">
                            {s.variants.map((v) => (
                              <li key={v.id} className="flex items-baseline justify-between gap-4 border-b border-dashed border-ink/10 pb-2">
                                <span>{v.name}</span>
                                <span className="shrink-0 text-taupe">
                                  {v.price_cents != null ? formatPrice(v.price_cents) : "Tarif à venir"}
                                  {v.duration_min ? ` · ${formatDuration(v.duration_min)}` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {s.options.length > 0 && (
                          <p className="mt-4 text-sm text-taupe">
                            Option{s.options.length > 1 ? "s" : ""} :{" "}
                            {s.options.map((o) => `${o.name} (+${formatPrice(o.price_cents)})`).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-6 md:flex-col md:items-end md:text-right">
                        <div>
                          {s.booking_mode === "quote" ? (
                            <p className="display text-xl">Sur devis</p>
                          ) : s.booking_mode === "request" ? (
                            <p className="display text-xl">{s.price_cents != null ? formatPrice(s.price_cents) : "Sur demande"}</p>
                          ) : p.fromPrice != null ? (
                            <p className="display text-xl">
                              {p.hasVariants && <span className="mr-1 text-xs tracking-wide text-mute">dès</span>}
                              {formatPrice(p.fromPrice)}
                            </p>
                          ) : (
                            <p className="text-sm text-mute">Tarif bientôt disponible</p>
                          )}
                          {s.booking_mode === "appointment" && p.duration != null && (
                            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-mute">
                              <Clock className="size-3.5" /> {p.hasVariants ? "dès " : ""}
                              {formatDuration(p.duration)}
                            </p>
                          )}
                        </div>
                        {p.bookable && (
                          <Link href={`/reservation?prestation=${s.id}`} className="btn btn-outline min-h-11 px-5">
                            {s.booking_mode === "quote" ? "Demander un devis" : s.booking_mode === "request" ? "Demander" : "Réserver"} <ArrowRight className="size-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ))}

      <section className="bg-ink px-6 py-16 text-center text-ivory">
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-ivory/70">
          {settings.deposit_enabled && <>{fill(content.deposit_text, vars)} </>}
          {fill(content.cancellation_text, vars)}
        </p>
        <Link href="/reservation" className="btn btn-light mt-8">
          Réserver en ligne
        </Link>
      </section>
    </>
  );
}

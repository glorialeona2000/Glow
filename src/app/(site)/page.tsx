import Image from "next/image";
import Link from "next/link";
import { getCatalog, getContent, getGallery, getSettings } from "@/lib/data";
import { fill } from "@/lib/content";
import { formatPrice } from "@/lib/money";
import { ArrowRight, InstagramIcon, MapPin, Sparkle } from "@/components/icons";

export default async function HomePage() {
  const [content, catalog, gallery, settings] = await Promise.all([getContent(), getCatalog(), getGallery(), getSettings()]);
  const vars = { acompte: formatPrice(settings.deposit_cents), delai: `${settings.cancellation_hours} heures` };

  return (
    <>
      {/* HERO */}
      <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-ink text-ivory">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 45% at 50% 18%, rgba(214,193,159,0.16), transparent 70%), radial-gradient(40% 35% at 85% 90%, rgba(214,193,159,0.07), transparent 70%)",
          }}
        />
        {[
          ["12%", "22%", "0s", "size-2.5"],
          ["86%", "18%", "1.2s", "size-3"],
          ["78%", "62%", "2.1s", "size-2"],
          ["18%", "70%", "0.6s", "size-2"],
          ["50%", "8%", "1.7s", "size-2"],
        ].map(([left, top, delay, size], i) => (
          <span key={i} aria-hidden className="twinkle absolute text-champagne-light" style={{ left, top, animationDelay: delay }}>
            <Sparkle className={size} />
          </span>
        ))}
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pt-24 pb-36 text-center md:pb-24">
          <Image
            src="/brand/emblem-ivory.webp"
            alt="Emblème BELAVICA : une lionne devant des coupoles, dans une arche"
            width={180}
            height={267}
            priority
            className="fade-in h-auto w-[118px] md:w-[150px]"
          />
          <p className="fade-in wordmark mt-8 text-[2rem] leading-none md:text-5xl">Belavica</p>
          <p className="fade-in eyebrow mt-4 text-ivory/70">{content.hero_eyebrow}</p>
          <h1 className="fade-in-delay display mt-10 text-[2.1rem] text-balance md:text-5xl">{content.hero_title}</h1>
          <p className="fade-in-delay mt-6 max-w-xl text-[0.98rem] leading-relaxed text-ivory/75 text-pretty">{content.hero_text}</p>
          <div className="fade-in-delay-2 mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/reservation" className="btn btn-light">
              Réserver un rendez-vous
            </Link>
            <Link href="/prestations" className="btn btn-outline text-ivory hover:!bg-ivory hover:!text-ink">
              Découvrir les prestations
            </Link>
          </div>
        </div>
      </section>

      {/* SIGNATURE */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center md:py-28">
        <Sparkle className="reveal mx-auto size-4 text-champagne" />
        <p className="reveal display mt-6 text-2xl italic leading-snug text-balance md:text-[2.1rem]">{content.intro_quote}</p>
      </section>

      {/* PRESTATIONS */}
      <section className="bg-cream py-20 md:py-28" aria-labelledby="titre-prestations">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="reveal text-center">
            <p className="eyebrow text-champagne">L’univers Belavica</p>
            <h2 id="titre-prestations" className="display mt-4 text-4xl md:text-5xl">Les prestations</h2>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:mt-16 md:grid-cols-4 md:gap-x-8">
            {catalog.map((c, i) => (
              <Link key={c.id} href={`/prestations#${c.slug}`} className="reveal group block" style={{ transitionDelay: `${i * 90}ms` }}>
                <div className="arch relative aspect-[3/4] bg-sand">
                  {c.image_url && (
                    <Image
                      src={c.image_url}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 25vw, 50vw"
                      className="object-cover transition-transform duration-[1.6s] ease-[var(--ease-luxe)] group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="eyebrow mt-5 text-mute">{c.tagline}</p>
                <h3 className="display mt-2 text-xl md:text-2xl">{c.name}</h3>
                <span className="mt-3 inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-taupe">
                  Voir <ArrowRight className="size-3.5 transition-transform duration-500 group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* GALERIE */}
      {gallery.length > 0 && (
        <section id="galerie" className="scroll-mt-20 py-20 md:py-28" aria-labelledby="titre-galerie">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <div className="reveal flex flex-col items-center text-center">
              <p className="eyebrow text-champagne">Portfolio</p>
              <h2 id="titre-galerie" className="display mt-4 text-4xl md:text-5xl">Réalisations</h2>
            </div>
            <div className="mt-12 columns-2 gap-3 md:mt-16 md:columns-3 md:gap-5">
              {gallery.map((g, i) => (
                <figure key={g.id} className="reveal mb-3 break-inside-avoid md:mb-5" style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
                  <Image
                    src={g.image_url}
                    alt={g.alt}
                    width={800}
                    height={1000}
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="h-auto w-full bg-sand"
                  />
                  {g.category && <figcaption className="eyebrow mt-2 text-[0.6rem] text-mute">{g.category}</figcaption>}
                </figure>
              ))}
            </div>
            <div className="reveal mt-10 text-center">
              <a
                href={`https://instagram.com/${content.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                <InstagramIcon className="size-4" /> Plus sur Instagram
              </a>
            </div>
          </div>
        </section>
      )}

      {/* À PROPOS */}
      <section id="a-propos" className="scroll-mt-20 bg-sand/60 py-20 md:py-28" aria-labelledby="titre-apropos">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-20 md:px-8">
          <div className="reveal mx-auto w-full max-w-sm">
            <div className="arch relative aspect-[4/5] bg-stone">
              <Image src={content.about_image} alt={`Portrait de ${content.about_name}`} fill sizes="(min-width: 768px) 40vw, 90vw" className="object-cover object-top" />
            </div>
          </div>
          <div className="reveal">
            <p className="eyebrow text-champagne">À propos</p>
            <h2 id="titre-apropos" className="display mt-4 text-4xl md:text-5xl">{content.about_name}</h2>
            <p className="eyebrow mt-3 text-mute">{content.about_role}</p>
            <div className="mt-8 space-y-5 leading-relaxed text-taupe">
              {content.about_text.split(/\n\s*\n/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            <Link href="/reservation" className="btn btn-primary mt-10">
              Prendre rendez-vous
            </Link>
          </div>
        </div>
      </section>

      {/* INFOS PRATIQUES */}
      <section className="py-20 md:py-28" aria-labelledby="titre-infos">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="reveal text-center">
            <p className="eyebrow text-champagne">Bon à savoir</p>
            <h2 id="titre-infos" className="display mt-4 text-4xl md:text-5xl">Infos pratiques</h2>
          </div>
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-12">
            <div className="reveal border-t border-ink/15 pt-6">
              <MapPin className="size-5 text-champagne" />
              <h3 className="display mt-4 text-2xl">{content.city}</h3>
              <p className="mt-3 text-sm leading-relaxed text-taupe">{content.address_notice}</p>
            </div>
            <div className="reveal border-t border-ink/15 pt-6">
              <Sparkle className="size-4 text-champagne" />
              <h3 className="display mt-4 text-2xl">Réservation</h3>
              <p className="mt-3 text-sm leading-relaxed text-taupe">
                {settings.deposit_enabled && <>{fill(content.deposit_text, vars)} </>}
                {fill(content.cancellation_text, vars)}
              </p>
            </div>
            <div className="reveal border-t border-ink/15 pt-6">
              <InstagramIcon className="size-5 text-champagne" />
              <h3 className="display mt-4 text-2xl">@{content.instagram_handle}</h3>
              <p className="mt-3 text-sm leading-relaxed text-taupe">{content.contact_text}</p>
              <a
                href={`https://instagram.com/${content.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline mt-4 inline-block text-xs tracking-[0.2em] uppercase"
              >
                Écrire sur Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* APPEL FINAL */}
      <section className="relative overflow-hidden bg-ink py-20 text-center text-ivory md:py-24">
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(50% 70% at 50% 100%, rgba(214,193,159,0.14), transparent 70%)" }} />
        <div className="relative mx-auto max-w-2xl px-6">
          <p className="reveal eyebrow text-champagne-light">{content.hours_notice}</p>
          <h2 className="reveal display mt-5 text-4xl md:text-5xl">Offrez-vous un moment Belavica</h2>
          <Link href="/reservation" className="reveal btn btn-light mt-10">
            Réserver en ligne
          </Link>
        </div>
      </section>
    </>
  );
}

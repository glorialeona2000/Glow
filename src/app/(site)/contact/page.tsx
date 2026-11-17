import type { Metadata } from "next";
import Link from "next/link";
import { getContent, getSchedule } from "@/lib/data";
import { WEEKDAYS_FR } from "@/lib/time";
import { PageHero } from "@/components/PageHero";
import { InstagramIcon, MapPin, Clock } from "@/components/icons";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contacter BELAVICA Beauty Studio à Arlon : Instagram @bybelavica, réservation en ligne.",
};

export default async function ContactPage() {
  const [content, schedule] = await Promise.all([getContent(), getSchedule()]);
  const days = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
    day: WEEKDAYS_FR[d],
    ranges: schedule.hours.filter((h) => h.weekday === d).map((h) => `${h.start_time.replace(":", "h")} – ${h.end_time.replace(":", "h")}`),
  }));
  const hasHours = schedule.hours.length > 0;

  return (
    <>
      <PageHero eyebrow="Me contacter" title="Contact">
        {content.contact_text}
      </PageHero>
      <section className="mx-auto grid max-w-5xl gap-12 px-6 py-16 md:grid-cols-3 md:py-24">
        <div className="reveal">
          <InstagramIcon className="size-6 text-champagne" />
          <h2 className="display mt-4 text-2xl">Instagram</h2>
          <p className="mt-3 text-sm leading-relaxed text-taupe">Le moyen le plus rapide pour me joindre : envoyez-moi un message privé.</p>
          <a
            href={`https://instagram.com/${content.instagram_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary mt-6 w-full sm:w-auto"
          >
            @{content.instagram_handle}
          </a>
        </div>
        <div className="reveal">
          <MapPin className="size-6 text-champagne" />
          <h2 className="display mt-4 text-2xl">{content.city}</h2>
          <p className="mt-3 text-sm leading-relaxed text-taupe">{content.address_notice}</p>
        </div>
        <div className="reveal">
          <Clock className="size-6 text-champagne" />
          <h2 className="display mt-4 text-2xl">Horaires</h2>
          <p className="mt-3 text-sm text-taupe">{content.hours_notice}</p>
          {hasHours && (
            <dl className="mt-5 space-y-2 text-sm">
              {days.map((d) => (
                <div key={d.day} className="flex justify-between gap-4 border-b border-ink/10 pb-2">
                  <dt>{d.day}</dt>
                  <dd className="text-right text-taupe">{d.ranges.length ? d.ranges.join(", ") : "Fermé"}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>
      <section className="bg-cream px-6 py-16 text-center">
        <h2 className="display text-3xl md:text-4xl">Prête pour votre rendez-vous ?</h2>
        <Link href="/reservation" className="btn btn-primary mt-8">
          Réserver en ligne
        </Link>
      </section>
    </>
  );
}

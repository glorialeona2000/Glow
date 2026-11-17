import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookingEmailData } from "@/lib/bookings";
import { getContent, getSettings } from "@/lib/data";
import { verifyManageParam } from "@/lib/security";
import { formatPrice } from "@/lib/money";
import { formatDateLong, formatDuration, formatTime, now } from "@/lib/time";
import { fill } from "@/lib/content";
import { CancelForm } from "./CancelForm";

export const metadata: Metadata = { title: "Mon rendez-vous", robots: { index: false, follow: false } };

const STATUS: Record<string, string> = {
  pending: "En attente de validation",
  confirmed: "Confirmé",
  declined: "Non retenu",
  cancelled: "Annulé",
  completed: "Terminé",
  no_show: "Terminé",
};

export default async function ManageBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const id = verifyManageParam(token);
  if (!id) notFound();
  const [b, settings, content] = await Promise.all([getBookingEmailData(id), getSettings(), getContent()]);
  if (!b) notFound();

  const active = b.status === "pending" || b.status === "confirmed";
  const late =
    b.status === "confirmed" && !!b.starts_at && new Date(b.starts_at).getTime() - now().getTime() < settings.cancellation_hours * 3600_000;
  const past = !!b.starts_at && new Date(b.starts_at).getTime() < now().getTime();
  const vars = { acompte: formatPrice(settings.deposit_cents), delai: `${settings.cancellation_hours} heures` };

  const rows: [string, string][] = [
    ["Statut", STATUS[b.status] ?? b.status],
    ["Prestation", b.variant_name ? `${b.service_name} — ${b.variant_name}` : b.service_name],
  ];
  if (b.options.length) rows.push(["Options", b.options.map((o) => o.name).join(", ")]);
  if (b.starts_at) rows.push(["Date", formatDateLong(new Date(b.starts_at))], ["Heure", formatTime(new Date(b.starts_at))]);
  if (b.duration_min) rows.push(["Durée", formatDuration(b.duration_min)]);
  if (b.price_cents != null) rows.push(["Prix total", formatPrice(b.price_cents)]);
  rows.push(["Adresse", content.address_notice], ["Référence", b.ref]);

  return (
    <div className="mx-auto max-w-xl px-5 pt-28 pb-24 md:pt-36">
      <p className="eyebrow text-center text-champagne">Mon rendez-vous</p>
      <h1 className="display mt-3 text-center text-3xl md:text-4xl">Bonjour {b.first_name}</h1>
      <dl className="mt-10 divide-y divide-ink/10 border-y border-ink/10 bg-white px-5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4 py-3.5">
            <dt className="w-[38%] shrink-0 text-[0.65rem] tracking-[0.18em] uppercase text-mute">{k}</dt>
            <dd className="flex-1 text-sm first-letter:uppercase">{v}</dd>
          </div>
        ))}
      </dl>

      {active && !past ? (
        <div className="mt-10">
          <p className="text-sm leading-relaxed text-taupe">{fill(content.cancellation_text, vars)}</p>
          <p className="mt-3 text-sm leading-relaxed text-taupe">
            Pour déplacer votre rendez-vous, annulez-le puis choisissez un nouveau créneau, ou écrivez-moi sur Instagram (@{content.instagram_handle}).
          </p>
          <CancelForm token={token} late={late && b.deposit_cents > 0} hours={settings.cancellation_hours} isPending={b.status === "pending"} />
        </div>
      ) : (
        <div className="mt-10 text-center">
          {b.status === "cancelled" && (
            <p role="status" className="mb-8 border-l-2 border-success bg-success/5 px-4 py-3 text-left text-sm text-success">
              Ce rendez-vous a été annulé.{b.late && b.deposit_cents > 0 ? " L’annulation étant intervenue tardivement, l’acompte est conservé." : ""}
            </p>
          )}
          {b.status === "declined" && (
            <p className="mb-8 text-sm text-taupe">Cette demande n’a pas pu être acceptée. N’hésitez pas à choisir un autre créneau.</p>
          )}
          <Link href="/reservation" className="btn btn-primary">
            Prendre un nouveau rendez-vous
          </Link>
        </div>
      )}
    </div>
  );
}

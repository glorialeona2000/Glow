import Link from "next/link";
import { db } from "@/lib/db";
import { bookingsBetween, pendingBookings } from "@/lib/admin-data";
import { getCatalog, getSchedule, getSettings, servicePricing } from "@/lib/data";
import { addDays, toDateStr, zonedToUtc, formatDateLong } from "@/lib/time";
import { emailConfigured } from "@/lib/email";
import { comingSoonEnabled } from "@/lib/launch";
import { BookingCard } from "@/components/admin/BookingCard";
import { Card, Empty, PageTitle } from "@/components/admin/ui";
import { PendingActions } from "./PendingActions";

export default async function Dashboard() {
  const settings = await getSettings();
  const tz = settings.timezone;
  const today = toDateStr(new Date(), tz);
  const [pending, upcoming, catalog, schedule, [{ failed }]] = await Promise.all([
    pendingBookings(),
    bookingsBetween(zonedToUtc(today, 0, tz), zonedToUtc(addDays(today, 8), 0, tz)),
    getCatalog(false),
    getSchedule(),
    db()<{ failed: number }[]>`select count(*)::int as failed from email_log where status = 'failed' and created_at > now() - interval '7 days'`,
  ]);
  const todays = upcoming.filter((b) => b.starts_at && toDateStr(b.starts_at, tz) === today && b.status === "confirmed");
  const later = upcoming.filter((b) => b.starts_at && toDateStr(b.starts_at, tz) !== today && b.status === "confirmed");
  const unpriced = catalog.flatMap((c) => c.services).filter((s) => s.visible && s.booking_mode === "appointment" && !servicePricing(s).bookable);

  const todo: { text: string; href: string }[] = [];
  if (await comingSoonEnabled()) todo.push({ text: "Le site est en mode « Bientôt disponible » (non publié). Aperçu et publication : Paramètres.", href: "/admin/parametres" });
  if (!schedule.hours.length) todo.push({ text: "Définir vos horaires de travail (aucun créneau n’est proposé pour l’instant).", href: "/admin/disponibilites" });
  if (unpriced.length) todo.push({ text: `${unpriced.length} prestation(s) sans prix ou durée : elles ne sont pas réservables en ligne.`, href: "/admin/prestations" });
  if (!emailConfigured()) todo.push({ text: "Le service d’e-mail n’est pas configuré : aucun e-mail n’est envoyé.", href: "/admin/parametres" });
  if (failed) todo.push({ text: `${failed} e-mail(s) en échec ces 7 derniers jours.`, href: "/admin/parametres#journal" });

  return (
    <>
      <PageTitle
        title="Bonjour"
        sub={<span className="first-letter:uppercase">{formatDateLong(new Date(), tz)}</span>}
        actions={
          <>
            <Link href="/admin/reservations/nouvelle" className="btn btn-primary min-h-11 px-5">+ Rendez-vous</Link>
            <Link href="/admin/disponibilites#bloquer" className="btn btn-outline min-h-11 px-5">Bloquer un créneau</Link>
          </>
        }
      />
      {todo.length > 0 && (
        <Card title="À faire" className="mb-6 border-warning/30">
          <ul className="space-y-2 text-sm">
            {todo.map((t) => (
              <li key={t.text}>
                <Link href={t.href} className="flex gap-3 hover:underline">
                  <span className="text-warning">●</span> {t.text}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Demandes en attente (${pending.length})`} className="lg:col-span-2">
          {pending.length ? (
            <div>
              {pending.map((b) => (
                <div key={b.id} className="flex flex-col gap-2 border-b border-ink/10 last:border-0 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1"><BookingCard b={b} /></div>
                  <PendingActions id={b.id} kind={b.kind} quote={!!b.details?.date} />
                </div>
              ))}
            </div>
          ) : (
            <Empty>Aucune demande en attente.</Empty>
          )}
        </Card>
        <Card title="Aujourd’hui">
          {todays.length ? todays.map((b) => <BookingCard key={b.id} b={b} showDate={false} />) : <Empty>Aucun rendez-vous confirmé aujourd’hui.</Empty>}
        </Card>
        <Card title="7 prochains jours" actions={<Link href="/admin/agenda?vue=semaine" className="text-xs underline">Agenda</Link>}>
          {later.length ? later.map((b) => <BookingCard key={b.id} b={b} />) : <Empty>Rien de prévu.</Empty>}
        </Card>
      </div>
    </>
  );
}

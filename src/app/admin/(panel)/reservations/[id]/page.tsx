import Link from "next/link";
import { notFound } from "next/navigation";
import { emailLogFor, getBooking } from "@/lib/admin-data";
import { getSettings } from "@/lib/data";
import { formatPrice, centsToInput } from "@/lib/money";
import { formatDateLong, formatDuration, formatTime, toDateStr, minutesOfDay, minutesToTime } from "@/lib/time";
import { manageUrl } from "@/lib/security";
import { weddingRows } from "@/lib/quote";
import { Card, DEPOSIT_LABEL, PageTitle, StatusBadge } from "@/components/admin/ui";
import { BookingActions } from "./BookingActions";

export const metadata = { title: "Réservation" };

const KIND_LABEL: Record<string, string> = {
  request_received: "Demande reçue (cliente)",
  admin_new_request: "Nouvelle demande (vous)",
  confirmed: "Confirmation (cliente)",
  declined: "Refus (cliente)",
  cancelled: "Annulation (cliente)",
  admin_cancelled: "Annulation (vous)",
  rescheduled: "Modification (cliente)",
  reminder: "Rappel (cliente)",
};

export default async function BookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [b, emails, settings] = await Promise.all([getBooking(id), emailLogFor(id), getSettings()]);
  if (!b) notFound();
  const tz = settings.timezone;
  const name = b.first_name ? `${b.first_name} ${b.last_name}` : "Cliente supprimée";

  const rows: [string, React.ReactNode][] = [
    ["Prestation", `${b.category_name} · ${b.service_name}${b.variant_name ? ` — ${b.variant_name}` : ""}`],
  ];
  if (b.options.length) rows.push(["Options", b.options.map((o) => `${o.name}${o.price_cents != null ? ` (+${formatPrice(o.price_cents)})` : ""}`).join(", ")]);
  if (b.starts_at) rows.push(["Date", <span key="d" className="first-letter:uppercase">{formatDateLong(b.starts_at, tz)} à {formatTime(b.starts_at, tz)}</span>]);
  if (b.duration_min) rows.push(["Durée", formatDuration(b.duration_min)]);
  if (b.price_cents != null) rows.push(["Prix total", formatPrice(b.price_cents)]);
  if (b.deposit_cents) rows.push(["Acompte", `${formatPrice(b.deposit_cents)} — ${DEPOSIT_LABEL[b.deposit_status]}`]);
  if (b.preferred_schedule) rows.push(["Disponibilités", b.preferred_schedule]);
  rows.push(...weddingRows(b.details));
  if (b.client_comment) rows.push(["Commentaire", b.client_comment]);
  rows.push(["Origine", b.source === "admin" ? "Ajouté par vous" : "Réservation en ligne"]);
  rows.push(["Créée le", `${formatDateLong(b.created_at, tz)} à ${formatTime(b.created_at, tz)}`]);
  if (b.cancelled_at)
    rows.push([
      "Annulation",
      `${formatDateLong(b.cancelled_at, tz)} par ${b.cancelled_by === "client" ? "la cliente" : "vous"}${b.late_cancellation ? " (tardive)" : ""}${b.cancellation_reason ? ` — ${b.cancellation_reason}` : ""}`,
    ]);

  return (
    <>
      <PageTitle
        title={name}
        sub={
          <span className="flex flex-wrap items-center gap-3">
            <StatusBadge status={b.status} /> <span>Réf. {b.ref}</span>
          </span>
        }
        actions={<Link href="/admin/reservations" className="btn btn-outline min-h-11 px-5">← Retour</Link>}
      />
      {sp.ok && <p className="mb-6 border-l-2 border-success bg-success/5 px-4 py-3 text-sm text-success">Rendez-vous créé.</p>}
      {b.status === "cancelled" && !b.late_cancellation && b.deposit_status === "received" && (
        <p className="mb-6 border-l-2 border-warning bg-warning/5 px-4 py-3 text-sm text-warning">
          Annulation dans les délais : l’acompte reçu est à rembourser (puis indiquez « Acompte remboursé »).
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card title="Détails">
            <dl className="divide-y divide-ink/10 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex gap-4 py-3">
                  <dt className="w-32 shrink-0 text-xs tracking-[0.14em] uppercase text-mute">{k}</dt>
                  <dd className="min-w-0 flex-1 whitespace-pre-line">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <BookingActions
            b={{
              id: b.id,
              status: b.status,
              kind: b.kind,
              isQuote: !!b.details?.date,
              deposit_status: b.deposit_status,
              admin_note: b.admin_note,
              date: b.starts_at ? toDateStr(b.starts_at, tz) : "",
              time: b.starts_at ? minutesToTime(minutesOfDay(b.starts_at, tz)) : "",
              duration_min: b.duration_min ?? 60,
              price: centsToInput(b.price_cents),
              hasEmail: !!b.email,
            }}
          />
        </div>
        <div className="space-y-6">
          <Card title="Cliente">
            {b.client_id ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{name}</p>
                <p><a className="underline" href={`tel:${b.phone}`}>{b.phone}</a></p>
                <p><a className="underline break-all" href={`mailto:${b.email}`}>{b.email}</a></p>
                <Link href={`/admin/clientes/${b.client_id}`} className="mt-3 inline-block text-xs underline">Fiche cliente et historique →</Link>
              </div>
            ) : (
              <p className="text-sm text-mute">Données supprimées.</p>
            )}
          </Card>
          <Card title="E-mails">
            {emails.length ? (
              <ul className="space-y-3 text-sm">
                {emails.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3 border-b border-ink/10 pb-2 last:border-0">
                    <span>
                      {KIND_LABEL[e.kind] ?? e.kind}
                      <span className="block text-xs text-mute">{formatDateLong(e.created_at, tz)} {formatTime(e.created_at, tz)}</span>
                      {e.error && <span className="block text-xs text-danger">{e.error}</span>}
                    </span>
                    <span className={`shrink-0 text-xs ${e.status === "sent" ? "text-success" : e.status === "failed" ? "text-danger" : "text-mute"}`}>
                      {e.status === "sent" ? "Envoyé" : e.status === "failed" ? "Échec" : "Non envoyé"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-mute">Aucun e-mail.</p>
            )}
          </Card>
          {b.client_id && ["pending", "confirmed"].includes(b.status) && (
            <Card title="Lien cliente">
              <p className="text-xs text-taupe">Lien personnel « gérer mon rendez-vous » (déjà inclus dans ses e-mails) :</p>
              <input readOnly value={manageUrl(b.id)} className="field mt-2 text-xs" />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

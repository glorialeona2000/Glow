import "server-only";
import { db } from "./db";
import { slotsForDate, slotsForRange } from "./availability";
import { getBusy, getCatalog, getContent, getSchedule, getSettings, type Service, type Settings } from "./data";
import { addDays, toDateStr, zonedToUtc } from "./time";
import { fill, type SiteContent } from "./content";
import { formatPrice } from "./money";
import { manageUrl, newRef, siteUrl } from "./security";
import { sendEmail, type SendResult } from "./email";
import {
  adminCancelledEmail,
  adminNewRequestEmail,
  cancelledEmail,
  confirmedEmail,
  declinedEmail,
  reminderEmail,
  requestReceivedEmail,
  rescheduledEmail,
  type BookingEmailData,
} from "./email-templates";

export class BookingError extends Error {
  constructor(public code: "slot_taken" | "invalid" | "rate_limited" | "unavailable", message: string) {
    super(message);
  }
}

export type Selection = {
  service: Service;
  categoryName: string;
  variant: Service["variants"][number] | null;
  options: Service["options"];
  durationMin: number | null;
  priceCents: number | null;
};

/** Valide le choix prestation / variante / options et calcule durée et prix totaux. */
export async function resolveSelection(
  serviceId: string,
  variantId: string | null,
  optionIds: string[],
  publicOnly = true,
): Promise<Selection> {
  const catalog = await getCatalog(publicOnly);
  for (const c of catalog) {
    const service = c.services.find((s) => s.id === serviceId);
    if (!service) continue;
    let variant: Selection["variant"] = null;
    if (service.variants.length) {
      variant = service.variants.find((v) => v.id === variantId) ?? null;
      if (!variant) throw new BookingError("invalid", "Veuillez choisir une formule.");
    }
    const uniq = [...new Set(optionIds)];
    const options = uniq.map((id) => {
      const o = service.options.find((x) => x.id === id);
      if (!o) throw new BookingError("invalid", "Option non disponible pour cette prestation.");
      return o;
    });
    if (service.booking_mode !== "appointment") {
      return { service, categoryName: c.name, variant, options: [], durationMin: null, priceCents: service.price_cents };
    }
    const baseDuration = variant ? variant.duration_min : service.duration_min;
    const basePrice = variant ? variant.price_cents : service.price_cents;
    if (baseDuration == null || basePrice == null) {
      throw new BookingError("unavailable", "Cette prestation n’est pas encore réservable en ligne.");
    }
    if (options.some((o) => o.price_cents == null)) {
      throw new BookingError("unavailable", "Cette option n’est pas encore disponible.");
    }
    return {
      service,
      categoryName: c.name,
      variant,
      options,
      durationMin: baseDuration + options.reduce((a, o) => a + o.duration_min, 0),
      priceCents: basePrice + options.reduce((a, o) => a + (o.price_cents ?? 0), 0),
    };
  }
  throw new BookingError("invalid", "Prestation introuvable.");
}

async function availabilityContext(settings: Settings, fromDate: string, toDate: string, excludeId?: string) {
  const from = zonedToUtc(addDays(fromDate, -1), 0, settings.timezone);
  const to = zonedToUtc(addDays(toDate, 2), 0, settings.timezone);
  const [schedule, busy] = await Promise.all([getSchedule(), getBusy(from, to, excludeId)]);
  return {
    tz: settings.timezone,
    slotIntervalMin: settings.slot_interval_min,
    bufferMin: settings.buffer_min,
    minNoticeHours: settings.min_notice_hours,
    maxDaysAhead: settings.max_days_ahead,
    workingHours: schedule.hours,
    breaks: schedule.breaks,
    ...busy,
  };
}

export async function availableSlots(durationMin: number, fromDate: string, toDate: string, opts: { now?: Date } = {}) {
  const settings = await getSettings();
  const ctx = await availabilityContext(settings, fromDate, toDate);
  const now = opts.now ?? new Date();
  return slotsForRange(fromDate, toDate, { ...ctx, durationMin, now });
}

function bookingCtx(content: SiteContent, settings: Settings, bookingId?: string) {
  const vars = {
    acompte: formatPrice(settings.deposit_cents),
    delai: `${settings.cancellation_hours} heures`,
  };
  return {
    siteUrl: siteUrl(),
    instagram: content.instagram_handle,
    addressNotice: content.address_notice,
    depositText: settings.deposit_enabled ? fill(content.deposit_text, vars) : "",
    cancellationText: fill(content.cancellation_text, vars),
    cancellationHours: settings.cancellation_hours,
    manageUrl: bookingId ? manageUrl(bookingId) : undefined,
  };
}

export async function getBookingEmailData(id: string): Promise<(BookingEmailData & { status: string; late: boolean }) | null> {
  const [b] = await db()<(BookingEmailData & { status: string; late: boolean })[]>`
    select b.id, b.ref, b.kind, b.status, b.late_cancellation as late, b.category_name, b.service_name, b.variant_name, b.options,
           b.starts_at, b.duration_min, b.price_cents, b.deposit_cents, b.client_comment, b.preferred_schedule, b.details,
           coalesce(c.first_name, '') as first_name, coalesce(c.last_name, '') as last_name,
           coalesce(c.email, '') as email, coalesce(c.phone, '') as phone
    from bookings b left join clients c on c.id = b.client_id
    where b.id = ${id}`;
  return b ?? null;
}

export type NewBooking = {
  serviceId: string;
  variantId: string | null;
  optionIds: string[];
  startsAt: Date | null; // null pour une demande de formation
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  comment: string;
  preferredSchedule?: string;
  /** Demande de devis mariage */
  details?: Record<string, unknown>;
  source: "online" | "admin";
  ipHash?: string;
  /** Admin : ignore horaires / délai minimum (jamais le chevauchement). */
  bypassRules?: boolean;
  /** Admin : durée et prix ajustés manuellement */
  overrideDurationMin?: number | null;
  overridePriceCents?: number | null;
};

/**
 * Crée une réservation. En ligne : statut "en attente" (validation manuelle).
 * La disponibilité est revérifiée côté serveur ; la contrainte d'exclusion en base
 * garantit qu'aucun double rendez-vous ne peut être enregistré, même en cas de
 * demandes simultanées.
 */
export async function createBooking(input: NewBooking) {
  const sql = db();
  const settings = await getSettings();
  const sel = await resolveSelection(input.serviceId, input.variantId, input.optionIds, input.source === "online");
  const isRequest = sel.service.booking_mode !== "appointment";
  const isQuote = sel.service.booking_mode === "quote";
  if (isQuote) {
    const d = input.details as { date?: string } | undefined;
    if (!d?.date) throw new BookingError("invalid", "Merci d’indiquer la date de votre mariage.");
    if (d.date < toDateStr(new Date(), settings.timezone)) throw new BookingError("invalid", "La date du mariage doit être à venir.");
  } else {
    input = { ...input, details: undefined };
  }

  if (input.source === "online" && input.ipHash) {
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from bookings
      where ip_hash = ${input.ipHash} and created_at > now() - interval '1 hour'`;
    if (n >= settings.max_requests_per_hour) {
      throw new BookingError("rate_limited", "Trop de demandes depuis votre connexion. Merci de réessayer plus tard ou de nous écrire sur Instagram.");
    }
    const [{ p }] = await sql<{ p: number }[]>`
      select count(*)::int as p from bookings b join clients c on c.id = b.client_id
      where lower(c.email) = lower(${input.email}) and b.status = 'pending'`;
    if (p >= 3) {
      throw new BookingError("rate_limited", "Vous avez déjà plusieurs demandes en attente. Merci de patienter jusqu’à leur validation.");
    }
  }

  let durationMin = input.overrideDurationMin ?? sel.durationMin;
  const priceCents = input.overridePriceCents !== undefined ? input.overridePriceCents : sel.priceCents;
  let startsAt: Date | null = null;
  let endsAt: Date | null = null;
  let blockUntil: Date | null = null;

  if (!isRequest) {
    if (!input.startsAt || !durationMin) throw new BookingError("invalid", "Créneau manquant.");
    startsAt = input.startsAt;
    if (!input.bypassRules) {
      const dateStr = toDateStr(startsAt, settings.timezone);
      const ctx = await availabilityContext(settings, dateStr, dateStr);
      const slots = slotsForDate(dateStr, { ...ctx, durationMin, now: new Date() });
      if (!slots.some((s) => s.getTime() === startsAt!.getTime())) {
        throw new BookingError("slot_taken", "Ce créneau vient d’être réservé ou n’est plus disponible. Merci d’en choisir un autre.");
      }
    }
    endsAt = new Date(startsAt.getTime() + durationMin * 60_000);
    blockUntil = new Date(endsAt.getTime() + settings.buffer_min * 60_000);
  } else {
    durationMin = null;
  }

  const status = input.source === "admin" ? "confirmed" : "pending";
  const deposit = settings.deposit_enabled && !isRequest ? settings.deposit_cents : 0;
  const depositStatus = deposit > 0 ? "awaiting" : "none";
  const optionsSnapshot = sel.options.map((o) => ({ id: o.id, name: o.name, price_cents: o.price_cents, duration_min: o.duration_min }));

  try {
    const id = await sql.begin(async (tx) => {
      const [client] = await tx<{ id: string }[]>`
        insert into clients (first_name, last_name, email, phone)
        values (${input.firstName}, ${input.lastName}, ${input.email.toLowerCase()}, ${input.phone})
        on conflict (lower(email)) do update
          set first_name = excluded.first_name, last_name = excluded.last_name,
              phone = excluded.phone, updated_at = now()
        returning id`;
      const [row] = await tx<{ id: string }[]>`
        insert into bookings (ref, kind, status, client_id, service_id, variant_id, category_name, service_name,
          variant_name, options, starts_at, ends_at, block_until, duration_min, price_cents, deposit_cents,
          deposit_status, client_comment, preferred_schedule, details, source, ip_hash)
        values (${newRef()}, ${isRequest ? "request" : "appointment"}, ${status}, ${client.id}, ${sel.service.id},
          ${sel.variant?.id ?? null}, ${sel.categoryName}, ${sel.service.name}, ${sel.variant?.name ?? null},
          ${sql.json(optionsSnapshot)}, ${startsAt?.toISOString() ?? null}::timestamptz, ${endsAt?.toISOString() ?? null}::timestamptz,
          ${blockUntil?.toISOString() ?? null}::timestamptz, ${durationMin}, ${priceCents}, ${deposit}, ${depositStatus},
          ${input.comment}, ${input.preferredSchedule ?? ""}, ${sql.json((input.details ?? {}) as never)}, ${input.source}, ${input.ipHash ?? null})
        returning id`;
      return row.id;
    });
    return id as string;
  } catch (e: unknown) {
    if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "23P01") {
      throw new BookingError("slot_taken", "Ce créneau vient d’être réservé ou n’est plus disponible. Merci d’en choisir un autre.");
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

async function ctxFor(bookingId: string) {
  const [content, settings, b] = await Promise.all([getContent(), getSettings(), getBookingEmailData(bookingId)]);
  return { content, settings, b, ctx: bookingCtx(content, settings, bookingId) };
}

export type NotifyResult = { client?: SendResult; admin?: SendResult };

export async function notifyNewBooking(bookingId: string): Promise<NotifyResult> {
  const { settings, b, ctx } = await ctxFor(bookingId);
  if (!b) return {};
  const replyTo = settings.notification_email;
  const isConfirmed = b.status === "confirmed";
  const clientMail = isConfirmed ? confirmedEmail(b, ctx) : requestReceivedEmail(b, ctx);
  const [client, admin] = await Promise.all([
    sendEmail({ to: b.email, ...clientMail, kind: isConfirmed ? "confirmed" : "request_received", bookingId, replyTo }),
    isConfirmed
      ? Promise.resolve(undefined)
      : sendEmail({
          to: settings.notification_email,
          ...adminNewRequestEmail(b, ctx, `${siteUrl()}/admin/reservations/${bookingId}`),
          kind: "admin_new_request",
          bookingId,
          replyTo: b.email,
        }),
  ]);
  return { client, admin };
}

export async function notifyStatus(
  bookingId: string,
  kind: "confirmed" | "declined" | "cancelled" | "rescheduled" | "reminder",
  opts: { reason?: string; late?: boolean; by?: "client" | "admin" } = {},
): Promise<NotifyResult> {
  const { settings, b, ctx } = await ctxFor(bookingId);
  if (!b || !b.email) return {};
  const replyTo = settings.notification_email;
  let mail;
  switch (kind) {
    case "confirmed":
      mail = confirmedEmail(b, ctx);
      break;
    case "declined":
      mail = declinedEmail(b, ctx, opts.reason ?? "");
      break;
    case "rescheduled":
      mail = rescheduledEmail(b, ctx);
      break;
    case "reminder":
      mail = reminderEmail(b, ctx);
      break;
    case "cancelled":
      mail = cancelledEmail(b, ctx, { by: opts.by ?? "admin", late: !!opts.late, reason: opts.reason ?? "" });
      break;
  }
  const client = await sendEmail({ to: b.email, ...mail, kind, bookingId, replyTo });
  let admin: SendResult | undefined;
  if (kind === "cancelled" && opts.by === "client") {
    admin = await sendEmail({
      to: settings.notification_email,
      ...adminCancelledEmail(b, ctx, `${siteUrl()}/admin/reservations/${bookingId}`, !!opts.late),
      kind: "admin_cancelled",
      bookingId,
      replyTo: b.email,
    });
  }
  return { client, admin };
}

/** Annulation (cliente ou admin). Renvoie si l'annulation est tardive. */
export async function cancelBooking(bookingId: string, by: "client" | "admin", reason = "") {
  const sql = db();
  const settings = await getSettings();
  const [b] = await sql<{ status: string; starts_at: Date | null; deposit_status: string }[]>`
    select status, starts_at, deposit_status from bookings where id = ${bookingId}`;
  if (!b) throw new BookingError("invalid", "Rendez-vous introuvable.");
  if (!["pending", "confirmed"].includes(b.status)) throw new BookingError("invalid", "Ce rendez-vous est déjà clôturé.");
  const late =
    by === "client" &&
    b.status === "confirmed" &&
    !!b.starts_at &&
    b.starts_at.getTime() - Date.now() < settings.cancellation_hours * 3600_000;
  let depositStatus = b.deposit_status;
  if (b.status === "pending" && depositStatus === "awaiting") depositStatus = "none";
  if (late && ["awaiting", "received"].includes(depositStatus)) depositStatus = "forfeited";
  await sql`update bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = ${by},
              cancellation_reason = ${reason}, late_cancellation = ${late}, deposit_status = ${depositStatus},
              updated_at = now()
            where id = ${bookingId} and status in ('pending','confirmed')`;
  return { late };
}

export function bookingErrorMessage(e: unknown) {
  if (e instanceof BookingError) return e.message;
  console.error(e);
  return "Une erreur est survenue. Merci de réessayer dans un instant.";
}

export { formatPrice };

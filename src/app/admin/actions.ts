"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { CONTENT_FIELDS } from "@/lib/content";
import { parsePriceToCents } from "@/lib/money";
import { b, err, n, ok, s, type FormState } from "@/lib/form";
import { BookingError, cancelBooking, createBooking, notifyStatus } from "@/lib/bookings";
import { getSettings } from "@/lib/data";
import { isValidDateStr, timeToMinutes, zonedToUtc } from "@/lib/time";
import { sendEmail } from "@/lib/email";

const UUID = /^[0-9a-f-]{36}$/;
function id(fd: FormData, k = "id") {
  const v = s(fd, k);
  if (!UUID.test(v)) throw new Error("Identifiant invalide");
  return v;
}
function price(fd: FormData, k: string) {
  return parsePriceToCents(s(fd, k));
}
function fail(e: unknown): FormState {
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
  if (e instanceof BookingError && e.code === "slot_taken") return err("Ce créneau chevauche un autre rendez-vous (temps tampon inclus).");
  if (e instanceof BookingError) return err(e.message);
  if (e && typeof e === "object" && "code" in e) {
    const code = (e as { code: string }).code;
    if (code === "23P01") return err("Ce créneau chevauche un autre rendez-vous (temps tampon inclus).");
    if (code === "23505") return err("Cet élément existe déjà.");
    if (code === "23514") return err("Une valeur est hors des limites autorisées.");
  }
  console.error(e);
  return err(e instanceof Error ? e.message : "Erreur inattendue.");
}
/** Message affiché en haut de l'admin, même si le bloc d'origine disparaît (changement de statut). */
async function flash(state: FormState): Promise<FormState> {
  const msg = state?.ok ?? state?.error;
  if (msg) {
    (await cookies()).set("admin_flash", encodeURIComponent(`${state?.error ? "!" : ""}${msg}`), { path: "/admin", maxAge: 60, sameSite: "lax" });
  }
  return state;
}

function emailNote(status: string | undefined) {
  if (status === "sent") return " E-mail envoyé à la cliente.";
  if (status === "skipped") return " (E-mail non envoyé : service d’e-mail non configuré.)";
  if (status === "failed") return " ⚠ L’e-mail n’a pas pu être envoyé (voir Paramètres > Journal des e-mails).";
  return "";
}

// ---------------------------------------------------------------------------
// Réservations
// ---------------------------------------------------------------------------

export async function acceptBooking(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const bid = id(fd);
    const rows = await db()`update bookings set status = 'confirmed', updated_at = now()
                            where id = ${bid} and status = 'pending' returning id`;
    if (!rows.length) return err("Cette demande n’est plus en attente.");
    const mail = await notifyStatus(bid, "confirmed");
    revalidatePath("/admin", "layout");
    return flash(ok("Rendez-vous confirmé." + emailNote(mail.client?.status)));
  } catch (e) {
    return fail(e);
  }
}

export async function declineBooking(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const bid = id(fd);
    const reason = s(fd, "reason", 600);
    const rows = await db()`update bookings set status = 'declined', cancellation_reason = ${reason},
                              deposit_status = case when deposit_status = 'awaiting' then 'none' else deposit_status end,
                              updated_at = now()
                            where id = ${bid} and status = 'pending' returning id`;
    if (!rows.length) return err("Cette demande n’est plus en attente.");
    const mail = b(fd, "notify") ? await notifyStatus(bid, "declined", { reason }) : {};
    revalidatePath("/admin", "layout");
    return flash(ok("Demande refusée." + emailNote(mail.client?.status)));
  } catch (e) {
    return fail(e);
  }
}

export async function adminCancelBooking(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const bid = id(fd);
    const reason = s(fd, "reason", 600);
    await cancelBooking(bid, "admin", reason);
    const mail = b(fd, "notify") ? await notifyStatus(bid, "cancelled", { by: "admin", reason }) : {};
    revalidatePath("/admin", "layout");
    return flash(ok("Rendez-vous annulé." + emailNote(mail.client?.status)));
  } catch (e) {
    return fail(e);
  }
}

export async function setBookingStatus(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const bid = id(fd);
    const status = s(fd, "status");
    if (!["completed", "no_show", "confirmed"].includes(status)) return err("Statut invalide.");
    await db()`update bookings set status = ${status}, updated_at = now() where id = ${bid}`;
    revalidatePath("/admin", "layout");
    return flash(ok("Statut mis à jour."));
  } catch (e) {
    return fail(e);
  }
}

export async function updateBookingMeta(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const bid = id(fd);
    const deposit = s(fd, "deposit_status");
    if (!["none", "awaiting", "received", "forfeited", "refunded"].includes(deposit)) return err("Statut d’acompte invalide.");
    await db()`update bookings set deposit_status = ${deposit}, admin_note = ${s(fd, "admin_note", 2000)}, updated_at = now()
               where id = ${bid}`;
    revalidatePath("/admin", "layout");
    return ok("Enregistré.");
  } catch (e) {
    return fail(e);
  }
}

/** Modifier date / heure / durée / prix d'un rendez-vous (sans contrainte d'horaires, jamais de chevauchement). */
export async function rescheduleBooking(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const bid = id(fd);
    const date = s(fd, "date");
    const time = s(fd, "time");
    const duration = n(fd, "duration_min");
    if (!isValidDateStr(date) || !/^\d{2}:\d{2}$/.test(time)) return err("Date ou heure invalide.");
    if (!duration || duration <= 0 || duration > 720) return err("Durée invalide.");
    const settings = await getSettings();
    const start = zonedToUtc(date, timeToMinutes(time), settings.timezone);
    const end = new Date(start.getTime() + duration * 60_000);
    const block = new Date(end.getTime() + settings.buffer_min * 60_000);
    const priceCents = price(fd, "price");
    const rows = await db()`update bookings set starts_at = ${start.toISOString()}::timestamptz, ends_at = ${end.toISOString()}::timestamptz,
                block_until = ${block.toISOString()}::timestamptz, duration_min = ${duration}, price_cents = ${priceCents},
                kind = 'appointment', updated_at = now(), reminder_sent_at = null
              where id = ${bid} and status in ('pending','confirmed') returning id`;
    if (!rows.length) return err("Seuls les rendez-vous en attente ou confirmés peuvent être modifiés.");
    const mail = b(fd, "notify") ? await notifyStatus(bid, "rescheduled") : {};
    revalidatePath("/admin", "layout");
    return ok("Rendez-vous mis à jour." + emailNote(mail.client?.status));
  } catch (e) {
    return fail(e);
  }
}

export async function resendConfirmation(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const bid = id(fd);
    const [row] = await db()<{ status: string }[]>`select status from bookings where id = ${bid}`;
    if (row?.status !== "confirmed") return err("Le rendez-vous n’est pas confirmé.");
    const mail = await notifyStatus(bid, "confirmed");
    revalidatePath(`/admin/reservations/${bid}`);
    return mail.client?.status === "sent" ? ok("E-mail renvoyé.") : err("Échec de l’envoi." + emailNote(mail.client?.status));
  } catch (e) {
    return fail(e);
  }
}

export async function createManualBooking(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  let newId: string;
  try {
    const date = s(fd, "date");
    const time = s(fd, "time");
    if (!isValidDateStr(date) || !/^\d{2}:\d{2}$/.test(time)) return err("Date ou heure invalide.");
    const email = s(fd, "email", 120).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err("E-mail invalide.");
    const firstName = s(fd, "first_name", 60);
    const lastName = s(fd, "last_name", 60);
    const phone = s(fd, "phone", 25);
    if (!firstName || !lastName || !phone) return err("Prénom, nom et téléphone requis.");
    const settings = await getSettings();
    const variant = s(fd, "variant_id");
    newId = await createBooking({
      serviceId: id(fd, "service_id"),
      variantId: UUID.test(variant) ? variant : null,
      optionIds: fd.getAll("option_ids").map(String).filter((x) => UUID.test(x)),
      startsAt: zonedToUtc(date, timeToMinutes(time), settings.timezone),
      firstName,
      lastName,
      email,
      phone,
      comment: s(fd, "comment", 800),
      source: "admin",
      bypassRules: true,
      overrideDurationMin: n(fd, "duration_min"),
      overridePriceCents: s(fd, "price") ? price(fd, "price") : undefined,
    });
    if (b(fd, "notify")) await notifyStatus(newId, "confirmed");
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/reservations/${newId}?ok=1`);
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export async function updateClient(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const cid = id(fd);
    const email = s(fd, "email", 120).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err("E-mail invalide.");
    await db()`update clients set first_name = ${s(fd, "first_name", 60)}, last_name = ${s(fd, "last_name", 60)},
               email = ${email}, phone = ${s(fd, "phone", 25)}, notes = ${s(fd, "notes", 5000)}, updated_at = now()
               where id = ${cid}`;
    revalidatePath("/admin", "layout");
    return ok("Fiche cliente enregistrée.");
  } catch (e) {
    return fail(e);
  }
}

/** Droit à l'effacement : supprime la fiche, anonymise l'historique (statistiques conservées). */
export async function eraseClient(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const cid = id(fd);
    if (s(fd, "confirm") !== "SUPPRIMER") return err("Tapez SUPPRIMER pour confirmer.");
    const sql = db();
    await sql.begin(async (tx) => {
      await tx`update bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin',
                 cancellation_reason = 'Données supprimées à la demande de la cliente'
               where client_id = ${cid} and status in ('pending','confirmed') and starts_at > now()`;
      await tx`update bookings set client_comment = '', preferred_schedule = '', admin_note = '', ip_hash = null
               where client_id = ${cid}`;
      await tx`update email_log set recipient = 'supprimé' where booking_id in (select id from bookings where client_id = ${cid})`;
      await tx`delete from clients where id = ${cid}`;
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/clientes?supprime=1");
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export async function saveCategory(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const cid = id(fd);
    const name = s(fd, "name", 80);
    if (!name) return err("Nom requis.");
    await db()`update categories set name = ${name}, tagline = ${s(fd, "tagline", 120)}, description = ${s(fd, "description", 1000)},
               image_url = ${s(fd, "image_url", 300) || null}, sort = ${n(fd, "sort") ?? 0}, visible = ${b(fd, "visible")}
               where id = ${cid}`;
    revalidatePath("/", "layout");
    return ok("Catégorie enregistrée.");
  } catch (e) {
    return fail(e);
  }
}

export async function createService(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  let sid: string;
  try {
    const name = s(fd, "name", 120);
    if (!name) return err("Nom requis.");
    const [row] = await db()<{ id: string }[]>`
      insert into services (category_id, name, visible, sort)
      values (${id(fd, "category_id")}, ${name}, false,
              (select coalesce(max(sort), 0) + 1 from services where category_id = ${id(fd, "category_id")}))
      returning id`;
    sid = row.id;
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/prestations");
  redirect(`/admin/prestations/${sid}`);
}

export async function saveService(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const sid = id(fd);
    const name = s(fd, "name", 120);
    if (!name) return err("Nom requis.");
    const raw = s(fd, "booking_mode");
    const mode = raw === "request" || raw === "quote" ? raw : "appointment";
    const duration = n(fd, "duration_min");
    if (duration != null && (duration <= 0 || duration > 720)) return err("Durée invalide (1 à 720 minutes).");
    const highlights = s(fd, "highlights", 4000)
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const sql = db();
    await sql.begin(async (tx) => {
      await tx`update services set category_id = ${id(fd, "category_id")}, name = ${name}, description = ${s(fd, "description", 2000)},
                 highlights = ${highlights}::text[], note = ${s(fd, "note", 1000)}, price_cents = ${price(fd, "price")},
                 duration_min = ${duration}, booking_mode = ${mode}, requires_deposit = ${b(fd, "requires_deposit")}, sort = ${n(fd, "sort") ?? 0}, visible = ${b(fd, "visible")},
                 updated_at = now()
               where id = ${sid}`;
      const opts = fd.getAll("option_ids").map(String).filter((x) => UUID.test(x));
      await tx`delete from service_option_links where service_id = ${sid}`;
      for (const o of opts) await tx`insert into service_option_links (service_id, option_id) values (${sid}, ${o})`;
    });
    revalidatePath("/", "layout");
    return ok("Prestation enregistrée.");
  } catch (e) {
    return fail(e);
  }
}

/** Suppression "douce" : la prestation disparaît du site, l'historique des réservations est conservé. */
export async function archiveService(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    await db()`update services set archived_at = now(), visible = false where id = ${id(fd)}`;
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/", "layout");
  redirect("/admin/prestations?supprime=1");
}

export async function saveVariant(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const name = s(fd, "name", 120);
    if (!name) return err("Nom requis.");
    const duration = n(fd, "duration_min");
    if (duration != null && (duration <= 0 || duration > 720)) return err("Durée invalide.");
    const vid = s(fd, "id");
    if (UUID.test(vid)) {
      await db()`update service_variants set name = ${name}, description = ${s(fd, "description", 500)}, price_cents = ${price(fd, "price")},
                 duration_min = ${duration}, sort = ${n(fd, "sort") ?? 0}, visible = ${b(fd, "visible")} where id = ${vid}`;
    } else {
      await db()`insert into service_variants (service_id, name, description, price_cents, duration_min, sort, visible)
                 values (${id(fd, "service_id")}, ${name}, ${s(fd, "description", 500)}, ${price(fd, "price")}, ${duration},
                         ${n(fd, "sort") ?? 0}, true)`;
    }
    revalidatePath("/", "layout");
    return ok("Formule enregistrée.");
  } catch (e) {
    return fail(e);
  }
}

export async function archiveVariant(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    await db()`update service_variants set archived_at = now(), visible = false where id = ${id(fd)}`;
    revalidatePath("/", "layout");
    return ok("Formule supprimée.");
  } catch (e) {
    return fail(e);
  }
}

export async function saveOption(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const name = s(fd, "name", 120);
    if (!name) return err("Nom requis.");
    const duration = n(fd, "duration_min") ?? 0;
    if (duration < 0 || duration > 240) return err("Durée invalide (0 à 240 minutes).");
    const oid = s(fd, "id");
    if (UUID.test(oid)) {
      await db()`update service_options set name = ${name}, description = ${s(fd, "description", 500)}, price_cents = ${price(fd, "price")},
                 duration_min = ${duration}, active = ${b(fd, "active")}, sort = ${n(fd, "sort") ?? 0} where id = ${oid}`;
    } else {
      await db()`insert into service_options (name, description, price_cents, duration_min, active)
                 values (${name}, ${s(fd, "description", 500)}, ${price(fd, "price")}, ${duration}, true)`;
    }
    revalidatePath("/", "layout");
    return ok("Option enregistrée.");
  } catch (e) {
    return fail(e);
  }
}

export async function archiveOption(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const oid = id(fd);
    await db()`update service_options set archived_at = now(), active = false where id = ${oid}`;
    await db()`delete from service_option_links where option_id = ${oid}`;
    revalidatePath("/", "layout");
    return ok("Option supprimée.");
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Disponibilités
// ---------------------------------------------------------------------------

function timeOk(t: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export async function addWeeklyRange(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const table = s(fd, "table") === "breaks" ? "breaks" : "working_hours";
    const weekdays = fd.getAll("weekday").map(Number).filter((w) => w >= 1 && w <= 7);
    const start = s(fd, "start_time");
    const end = s(fd, "end_time");
    if (!weekdays.length) return err("Choisissez au moins un jour.");
    if (!timeOk(start) || !timeOk(end) || timeToMinutes(end) <= timeToMinutes(start)) return err("Horaires invalides.");
    const sql = db();
    for (const w of weekdays) {
      if (table === "breaks") await sql`insert into breaks (weekday, start_time, end_time, label) values (${w}, ${start}, ${end}, ${s(fd, "label", 60) || "Pause"})`;
      else await sql`insert into working_hours (weekday, start_time, end_time) values (${w}, ${start}, ${end})`;
    }
    revalidatePath("/", "layout");
    return ok(table === "breaks" ? "Pause ajoutée." : "Horaires ajoutés.");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteWeeklyRange(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const rid = id(fd);
    if (s(fd, "table") === "breaks") await db()`delete from breaks where id = ${rid}`;
    else await db()`delete from working_hours where id = ${rid}`;
    revalidatePath("/", "layout");
    return ok("Supprimé.");
  } catch (e) {
    return fail(e);
  }
}

export async function addTimeOff(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const settings = await getSettings();
    const kind = s(fd, "kind") === "vacation" ? "vacation" : "block";
    const startDate = s(fd, "start_date");
    const endDate = s(fd, "end_date") || startDate;
    if (!isValidDateStr(startDate) || !isValidDateStr(endDate)) return err("Dates invalides.");
    let start: Date, end: Date;
    if (kind === "vacation") {
      start = zonedToUtc(startDate, 0, settings.timezone);
      end = zonedToUtc(endDate, 24 * 60, settings.timezone);
    } else {
      const st = s(fd, "start_time");
      const et = s(fd, "end_time");
      if (!timeOk(st) || !timeOk(et)) return err("Heures invalides.");
      start = zonedToUtc(startDate, timeToMinutes(st), settings.timezone);
      end = zonedToUtc(startDate, timeToMinutes(et), settings.timezone);
    }
    if (end <= start) return err("La fin doit être après le début.");
    await db()`insert into time_off (kind, starts_at, ends_at, reason)
               values (${kind}, ${start.toISOString()}::timestamptz, ${end.toISOString()}::timestamptz, ${s(fd, "reason", 200)})`;
    const [{ c }] = await db()<{ c: number }[]>`select count(*)::int as c from bookings where status in ('pending','confirmed')
        and tstzrange(starts_at, ends_at) && tstzrange(${start.toISOString()}::timestamptz, ${end.toISOString()}::timestamptz)`;
    revalidatePath("/", "layout");
    return ok(
      (kind === "vacation" ? "Congés enregistrés." : "Créneau bloqué.") +
        (c ? ` ⚠ ${c} rendez-vous existant(s) sur cette période : pensez à les déplacer ou les annuler.` : ""),
    );
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTimeOff(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    await db()`delete from time_off where id = ${id(fd)}`;
    revalidatePath("/", "layout");
    return ok("Supprimé.");
  } catch (e) {
    return fail(e);
  }
}

export async function saveBookingRules(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    await db()`update settings set slot_interval_min = ${n(fd, "slot_interval_min")}, buffer_min = ${n(fd, "buffer_min")},
               min_notice_hours = ${n(fd, "min_notice_hours")}, max_days_ahead = ${n(fd, "max_days_ahead")}, updated_at = now()
               where id = 1`;
    revalidatePath("/", "layout");
    return ok("Règles de réservation enregistrées.");
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Paramètres
// ---------------------------------------------------------------------------

export async function saveSettings(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const email = s(fd, "notification_email", 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err("E-mail de notification invalide.");
    await db()`update settings set notification_email = ${email}, deposit_enabled = ${b(fd, "deposit_enabled")},
               deposit_cents = ${price(fd, "deposit") ?? 0}, cancellation_hours = ${n(fd, "cancellation_hours")},
               reminders_enabled = ${b(fd, "reminders_enabled")}, reminder_hours_before = ${n(fd, "reminder_hours_before")},
               retention_months = ${n(fd, "retention_months")}, max_requests_per_hour = ${n(fd, "max_requests_per_hour")},
               updated_at = now()
               where id = 1`;
    revalidatePath("/", "layout");
    return ok("Paramètres enregistrés.");
  } catch (e) {
    return fail(e);
  }
}

export async function sendTestEmail(): Promise<FormState> {
  await requireAdmin();
  const settings = await getSettings();
  const r = await sendEmail({
    to: settings.notification_email,
    subject: "Test d’envoi — BELAVICA",
    html: "<p>Les e-mails du site BELAVICA fonctionnent correctement.</p>",
    text: "Les e-mails du site BELAVICA fonctionnent correctement.",
    kind: "test",
  });
  revalidatePath("/admin/parametres");
  if (r.status === "sent") return ok(`E-mail de test envoyé à ${settings.notification_email}.`);
  return err(r.status === "skipped" ? "Service d’e-mail non configuré (RESEND_API_KEY)." : `Échec : ${r.error}`);
}

// ---------------------------------------------------------------------------
// Site : textes, photos, galerie
// ---------------------------------------------------------------------------

export async function saveContent(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const sql = db();
    for (const f of CONTENT_FIELDS) {
      if (!fd.has(f.key)) continue;
      let v = s(fd, f.key, 5000);
      if (f.key === "instagram_handle") v = v.replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
      if (f.type === "image" && v && !/^\/(images|media)\//.test(v)) return err("Image invalide.");
      await sql`insert into site_content (key, value, updated_at) values (${f.key}, ${v}, now())
                on conflict (key) do update set value = excluded.value, updated_at = now()`;
    }
    revalidatePath("/", "layout");
    return ok("Textes enregistrés.");
  } catch (e) {
    return fail(e);
  }
}

const MAX_UPLOAD = 4.5 * 1024 * 1024;

async function storeImage(file: File) {
  if (!file || typeof file === "string" || file.size === 0) throw new Error("Aucun fichier.");
  if (file.size > MAX_UPLOAD) throw new Error("Image trop lourde (4,5 Mo maximum).");
  if (!/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(file.type)) throw new Error("Format non pris en charge (JPEG, PNG, WebP).");
  const input = Buffer.from(await file.arrayBuffer());
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const [m] = await db()<{ id: string }[]>`insert into media (content_type, width, height, bytes)
                                          values ('image/webp', ${info.width}, ${info.height}, ${data}) returning id`;
  return `/media/${m.id}.webp`;
}

/** Téléverse une image ; renvoie son URL. */
export async function uploadImage(fd: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  try {
    return { url: await storeImage(fd.get("file") as File) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Échec du téléversement." };
  }
}

export async function addGalleryItem(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const url = s(fd, "image_url", 300);
    if (!/^\/(images|media)\//.test(url)) return err("Ajoutez d’abord une photo.");
    await db()`insert into gallery_items (image_url, alt, category, sort)
               values (${url}, ${s(fd, "alt", 200)}, ${s(fd, "category", 60) || null},
                       (select coalesce(max(sort), 0) + 1 from gallery_items))`;
    revalidatePath("/", "layout");
    return ok("Photo ajoutée à la galerie.");
  } catch (e) {
    return fail(e);
  }
}

export async function saveGalleryItem(_p: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const gid = id(fd);
    if (s(fd, "_delete") === "1") {
      await db()`delete from gallery_items where id = ${gid}`;
      revalidatePath("/", "layout");
      return ok("Photo retirée.");
    }
    await db()`update gallery_items set alt = ${s(fd, "alt", 200)}, category = ${s(fd, "category", 60) || null},
               sort = ${n(fd, "sort") ?? 0}, visible = ${b(fd, "visible")} where id = ${gid}`;
    revalidatePath("/", "layout");
    return ok("Enregistré.");
  } catch (e) {
    return fail(e);
  }
}

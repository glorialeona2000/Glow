import { formatPrice } from "./money";
import { formatDateLong, formatDuration, formatTime } from "./time";
import { detailRows, type WeddingDetails } from "./quote";

export type BookingEmailData = {
  id: string;
  ref: string;
  kind: "appointment" | "request";
  category_name: string;
  service_name: string;
  variant_name: string | null;
  options: { name: string; price_cents: number | null; duration_min: number }[];
  starts_at: Date | null;
  duration_min: number | null;
  price_cents: number | null;
  deposit_cents: number;
  client_comment: string;
  preferred_schedule: string;
  details: (Partial<WeddingDetails> & { type?: string; startDate?: string }) | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

type Ctx = {
  siteUrl: string;
  instagram: string;
  addressNotice: string;
  depositText: string;
  cancellationText: string;
  cancellationHours: number;
  manageUrl?: string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function serviceLabel(b: BookingEmailData) {
  return b.variant_name ? `${b.service_name} — ${b.variant_name}` : b.service_name;
}

function rows(b: BookingEmailData, ctx: Ctx, withAddress = true): [string, string][] {
  const r: [string, string][] = [["Prestation", serviceLabel(b)]];
  if (b.options.length) r.push(["Options", b.options.map((o) => o.name).join(", ")]);
  if (b.starts_at) {
    r.push(["Date", formatDateLong(b.starts_at)]);
    r.push(["Heure", formatTime(b.starts_at)]);
  }
  if (b.duration_min) r.push(["Durée", formatDuration(b.duration_min)]);
  if (b.price_cents != null) r.push(["Prix total", formatPrice(b.price_cents)]);
  if (b.deposit_cents) r.push(["Acompte", formatPrice(b.deposit_cents)]);
  if (b.kind === "request" && b.preferred_schedule) r.push(["Dates idéales", b.preferred_schedule]);
  r.push(...detailRows(b.details));
  if (withAddress) r.push(["Adresse", ctx.addressNotice]);
  r.push(["Référence", b.ref]);
  return r;
}

function layout(title: string, intro: string, table: [string, string][], ctx: Ctx, extra = "", cta?: { href: string; label: string }) {
  const tableHtml = table
    .map(
      ([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #ece5db;color:#8a7f72;font-size:12px;letter-spacing:.12em;text-transform:uppercase;width:38%;vertical-align:top">${esc(k)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #ece5db;color:#0d0c0b;font-size:15px;vertical-align:top">${esc(v).replace(/\n/g, "<br>")}</td></tr>`,
    )
    .join("");
  const ctaHtml = cta
    ? `<p style="margin:28px 0 0;text-align:center"><a href="${cta.href}" style="display:inline-block;background:#0d0c0b;color:#f7f3ee;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:.2em;text-transform:uppercase">${esc(cta.label)}</a></p>`
    : "";
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f7f3ee;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;padding:36px 28px">
<tr><td align="center" style="padding-bottom:20px"><img src="${ctx.siteUrl}/brand/logo-email.png" width="150" alt="BELAVICA Beauty Studio" style="display:block;border:0"></td></tr>
<tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#0d0c0b;text-align:center;padding-bottom:12px">${esc(title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#3d3833;padding-bottom:16px">${intro}</td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tableHtml}</table></td></tr>
<tr><td style="font-size:14px;line-height:1.6;color:#3d3833;padding-top:18px">${extra}${ctaHtml}</td></tr>
<tr><td style="padding-top:30px;font-size:12px;color:#8a7f72;text-align:center;line-height:1.6">BELAVICA Beauty Studio · Arlon, Belgique<br>
<a href="https://instagram.com/${esc(ctx.instagram)}" style="color:#8a7f72">@${esc(ctx.instagram)}</a> · <a href="${ctx.siteUrl}" style="color:#8a7f72">belavica.com</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    title,
    "",
    intro.replace(/<[^>]+>/g, ""),
    "",
    ...table.map(([k, v]) => `${k} : ${v}`),
    "",
    extra.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, ""),
    cta ? `${cta.label} : ${cta.href}` : "",
    "",
    "BELAVICA Beauty Studio · Arlon, Belgique",
  ].join("\n");
  return { html, text };
}

const p = (s: string) => `<p style="margin:0 0 12px">${esc(s).replace(/\n/g, "<br>")}</p>`;

function isQuote(b: BookingEmailData) {
  return !!b.details?.date;
}

export function requestReceivedEmail(b: BookingEmailData, ctx: Ctx) {
  if (isQuote(b)) {
    return {
      subject: "Votre demande de devis mariage — BELAVICA",
      ...layout(
        "Demande de devis reçue",
        `Bonjour ${esc(b.first_name)},<br><br>Merci pour votre confiance et toutes mes félicitations pour votre mariage. J’étudie votre demande avec attention et vous envoie un devis personnalisé très prochainement.`,
        rows(b, ctx, false),
        ctx,
        b.client_comment ? p(`Vos envies : ${b.client_comment}`) : "",
      ),
    };
  }
  const isTraining = b.kind === "request";
  const subject = isTraining
    ? `Votre demande de formation — BELAVICA`
    : `Demande de rendez-vous reçue — BELAVICA`;
  const intro = isTraining
    ? `Bonjour ${esc(b.first_name)},<br><br>Merci pour votre demande de formation. Je reviens vers vous très vite pour construire ensemble votre planning de séances.`
    : `Bonjour ${esc(b.first_name)},<br><br>Merci pour votre demande. <strong>Elle n’est pas encore confirmée</strong> : je la valide personnellement et vous recevrez un e-mail de confirmation dès que votre rendez-vous sera accepté.`;
  const extra = isTraining ? "" : p(ctx.depositText) + p(ctx.cancellationText);
  return {
    subject,
    ...layout(
      isTraining ? "Demande de formation reçue" : "Demande reçue",
      intro,
      rows(b, ctx, false),
      ctx,
      extra,
      ctx.manageUrl && !isTraining ? { href: ctx.manageUrl, label: "Gérer ma demande" } : undefined,
    ),
  };
}

export function confirmedEmail(b: BookingEmailData, ctx: Ctx) {
  return {
    subject: `Rendez-vous confirmé — ${b.starts_at ? formatDateLong(b.starts_at) : ""}`,
    ...layout(
      "Votre rendez-vous est confirmé",
      `Bonjour ${esc(b.first_name)},<br><br>J’ai le plaisir de vous confirmer votre rendez-vous. Je me réjouis de vous accueillir.`,
      rows(b, ctx),
      ctx,
      p(ctx.depositText) + p(ctx.cancellationText),
      ctx.manageUrl ? { href: ctx.manageUrl, label: "Gérer mon rendez-vous" } : undefined,
    ),
  };
}

export function rescheduledEmail(b: BookingEmailData, ctx: Ctx) {
  return {
    subject: `Rendez-vous modifié — BELAVICA`,
    ...layout(
      "Votre rendez-vous a été modifié",
      `Bonjour ${esc(b.first_name)},<br><br>Votre rendez-vous a été mis à jour. Voici les nouvelles informations :`,
      rows(b, ctx),
      ctx,
      p(ctx.cancellationText),
      ctx.manageUrl ? { href: ctx.manageUrl, label: "Gérer mon rendez-vous" } : undefined,
    ),
  };
}

export function declinedEmail(b: BookingEmailData, ctx: Ctx, reason: string) {
  return {
    subject: `Votre demande de rendez-vous — BELAVICA`,
    ...layout(
      "Demande non disponible",
      `Bonjour ${esc(b.first_name)},<br><br>Je suis désolée, je ne peux malheureusement pas accepter votre demande pour ce créneau.${reason ? `<br><br>${esc(reason)}` : ""}<br><br>N’hésitez pas à choisir un autre moment sur le site ou à m’écrire sur Instagram.`,
      rows(b, ctx, false),
      ctx,
      "",
      { href: `${ctx.siteUrl}/reservation`, label: "Choisir un autre créneau" },
    ),
  };
}

export function cancelledEmail(b: BookingEmailData, ctx: Ctx, opts: { by: "client" | "admin"; late: boolean; reason: string }) {
  let intro = `Bonjour ${esc(b.first_name)},<br><br>`;
  intro +=
    opts.by === "client"
      ? "Votre annulation a bien été prise en compte."
      : `Votre rendez-vous a été annulé.${opts.reason ? `<br><br>${esc(opts.reason)}` : ""}`;
  if (opts.late && opts.by === "client") intro += `<br><br>L’annulation intervenant moins de ${ctx.cancellationHours} heures avant le rendez-vous, l’acompte est conservé, conformément aux conditions de réservation.`;
  return {
    subject: `Rendez-vous annulé — BELAVICA`,
    ...layout("Rendez-vous annulé", intro, rows(b, ctx, false), ctx, "", { href: `${ctx.siteUrl}/reservation`, label: "Reprendre rendez-vous" }),
  };
}

export function reminderEmail(b: BookingEmailData, ctx: Ctx) {
  return {
    subject: `Rappel : votre rendez-vous BELAVICA`,
    ...layout(
      "À très bientôt",
      `Bonjour ${esc(b.first_name)},<br><br>Petit rappel de votre rendez-vous :`,
      rows(b, ctx),
      ctx,
      p(ctx.cancellationText),
      ctx.manageUrl ? { href: ctx.manageUrl, label: "Gérer mon rendez-vous" } : undefined,
    ),
  };
}

export function adminNewRequestEmail(b: BookingEmailData, ctx: Ctx, adminUrl: string) {
  const table: [string, string][] = [
    ["Cliente", `${b.first_name} ${b.last_name}`],
    ["Téléphone", b.phone],
    ["E-mail", b.email],
    ...rows(b, ctx, false),
  ];
  if (b.client_comment) table.push(["Commentaire", b.client_comment]);
  const label = isQuote(b) ? "Nouvelle demande de devis mariage" : b.kind === "request" ? "Nouvelle demande de formation" : "Nouvelle demande de rendez-vous";
  return {
    subject: `${label} — ${b.first_name} ${b.last_name}${b.starts_at ? ` · ${formatDateLong(b.starts_at)} ${formatTime(b.starts_at)}` : ""}`,
    ...layout(label, "Une nouvelle demande attend votre validation.", table, ctx, "", { href: adminUrl, label: "Ouvrir dans l’admin" }),
  };
}

export function adminCancelledEmail(b: BookingEmailData, ctx: Ctx, adminUrl: string, late: boolean) {
  return {
    subject: `Annulation par la cliente — ${b.first_name} ${b.last_name}`,
    ...layout(
      "Annulation d’une cliente",
      `${esc(b.first_name)} ${esc(b.last_name)} a annulé ${b.kind === "request" ? "sa demande" : "son rendez-vous"}.${late ? `<br><strong>Annulation tardive (moins de ${ctx.cancellationHours} h) : acompte conservé.</strong>` : ""}`,
      rows(b, ctx, false),
      ctx,
      "",
      { href: adminUrl, label: "Ouvrir dans l’admin" },
    ),
  };
}

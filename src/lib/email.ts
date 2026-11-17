import "server-only";
import { db } from "./db";

export type EmailKind =
  | "request_received"
  | "admin_new_request"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "admin_cancelled"
  | "rescheduled"
  | "reminder"
  | "test";

export type SendResult = { status: "sent" | "failed" | "skipped"; error?: string };

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Envoie un e-mail via Resend et enregistre le résultat dans email_log.
 * Ne lève jamais d'exception : le statut réel est renvoyé et journalisé,
 * pour ne jamais prétendre qu'un e-mail est parti s'il a échoué.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: EmailKind;
  bookingId?: string | null;
  replyTo?: string;
}): Promise<SendResult> {
  let result: SendResult;
  let providerId: string | null = null;

  if (!emailConfigured()) {
    result = { status: "skipped", error: "Service d’e-mail non configuré (RESEND_API_KEY manquante)." };
  } else {
    try {
      const res = await fetch(`${process.env.RESEND_API_URL || "https://api.resend.com"}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "BELAVICA <reservations@belavica.com>",
          to: [opts.to],
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
          reply_to: opts.replyTo,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
      if (res.ok && data.id) {
        providerId = data.id;
        result = { status: "sent" };
      } else {
        result = { status: "failed", error: `${res.status} ${data.name ?? ""} ${data.message ?? ""}`.trim() };
      }
    } catch (e) {
      result = { status: "failed", error: e instanceof Error ? e.message : String(e) };
    }
  }

  try {
    await db()`insert into email_log (booking_id, kind, recipient, status, provider_id, error)
               values (${opts.bookingId ?? null}, ${opts.kind}, ${opts.to}, ${result.status}, ${providerId}, ${result.error ?? null})`;
  } catch (e) {
    console.error("email_log insert failed", e);
  }
  if (result.status === "failed") console.error(`[email] ${opts.kind} -> ${opts.to} failed: ${result.error}`);
  return result;
}

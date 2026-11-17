"use server";

import { z } from "zod";
import { BookingError, bookingErrorMessage, createBooking, notifyNewBooking } from "@/lib/bookings";
import { clientIp, hashIp, verifyTurnstile } from "@/lib/security";
import { trainingSchema, weddingSchema } from "@/lib/quote";
import { isLockedForVisitor } from "@/lib/launch";

const schema = z.object({
  serviceId: z.uuid(),
  variantId: z.uuid().nullable(),
  optionIds: z.array(z.uuid()).max(10),
  startsAt: z.iso.datetime().nullable(),
  firstName: z.string().trim().min(1, "Prénom requis").max(60),
  lastName: z.string().trim().min(1, "Nom requis").max(60),
  phone: z
    .string()
    .trim()
    .max(25)
    .regex(/^\+?[0-9 ().\-/]{8,}$/, "Numéro de téléphone invalide"),
  email: z.email("Adresse e-mail invalide").max(120),
  comment: z.string().trim().max(800).default(""),
  preferredSchedule: z.string().trim().max(800).default(""),
  wedding: weddingSchema.nullable().optional(),
  training: trainingSchema.nullable().optional(),
  consent: z.literal(true, { error: "Merci d’accepter les conditions." }),
  website: z.string().max(0).optional(), // champ piège anti-robot
  elapsedMs: z.number().int().nonnegative(),
  turnstileToken: z.string().max(4096).nullable().optional(),
});

export type BookingActionResult =
  | { ok: true; ref: string; status: "pending"; emailStatus: "sent" | "failed" | "skipped" }
  | { ok: false; error: string; code?: string };

export async function submitBooking(raw: unknown): Promise<BookingActionResult> {
  if (await isLockedForVisitor()) return { ok: false, error: "La réservation en ligne ouvre bientôt." };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parsed.data;
  if (d.website) return { ok: false, error: "Demande refusée." };
  if (d.elapsedMs < 4000) return { ok: false, error: "Merci de prendre le temps de vérifier votre demande." };

  const ip = await clientIp();
  if (!(await verifyTurnstile(d.turnstileToken, ip))) {
    return { ok: false, error: "La vérification anti-robot a échoué. Merci de réessayer." };
  }

  try {
    const id = await createBooking({
      serviceId: d.serviceId,
      variantId: d.variantId,
      optionIds: d.optionIds,
      startsAt: d.startsAt ? new Date(d.startsAt) : null,
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      comment: d.comment,
      preferredSchedule: d.preferredSchedule,
      details: d.wedding ? { type: "mariage", ...d.wedding } : d.training ? { type: "formation", ...d.training } : undefined,
      source: "online",
      ipHash: hashIp(ip),
    });
    const notify = await notifyNewBooking(id);
    const { db } = await import("@/lib/db");
    const [row] = await db()<{ ref: string }[]>`select ref from bookings where id = ${id}`;
    return { ok: true, ref: row.ref, status: "pending", emailStatus: notify.client?.status ?? "failed" };
  } catch (e) {
    return { ok: false, error: bookingErrorMessage(e), code: e instanceof BookingError ? e.code : undefined };
  }
}

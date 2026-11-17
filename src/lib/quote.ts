// Demande de devis mariage : champs communs au formulaire, aux e-mails et à l'admin.
import { z } from "zod";

export const weddingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date du mariage invalide"),
  place: z.string().trim().min(2, "Indiquez le lieu des préparatifs").max(200),
  readyTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).or(z.literal("")).default(""),
  people: z.number().int().min(1).max(30),
  trial: z.boolean(),
  touchUps: z.boolean(),
});
export type WeddingDetails = z.infer<typeof weddingSchema>;

function dateFr(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-BE", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, day, 12)),
  );
}

export const trainingSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).default(""),
});
export type TrainingDetails = z.infer<typeof trainingSchema>;

/** Détails d'une demande (mariage ou formation) en lignes lisibles. */
export function detailRows(d: Record<string, unknown> | null | undefined): [string, string][] {
  if (!d) return [];
  if (d.type === "formation") return d.startDate ? [["Début souhaité", dateFr(String(d.startDate))]] : [];
  return weddingRows(d as Partial<WeddingDetails>);
}

/** Lignes lisibles (libellé, valeur) pour un récapitulatif. */
export function weddingRows(d: Partial<WeddingDetails> | null | undefined): [string, string][] {
  if (!d || !d.date) return [];
  const rows: [string, string][] = [["Date du mariage", dateFr(d.date)]];
  if (d.place) rows.push(["Lieu des préparatifs", d.place]);
  if (d.readyTime) rows.push(["Prête pour", d.readyTime.replace(":", "h")]);
  if (d.people) rows.push(["Personnes à maquiller", d.people === 1 ? "La mariée uniquement" : `${d.people} (mariée incluse)`]);
  rows.push(["Essai maquillage", d.trial ? "Oui, souhaité" : "Non"]);
  rows.push(["Retouches en soirée", d.touchUps ? "Oui, souhaitées" : "Non"]);
  return rows;
}

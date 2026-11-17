import "server-only";
import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

// Mode « Bientôt disponible » : tant qu'il est actif, les visiteurs voient une page
// d'attente. L'administratrice voit le vrai site grâce à un lien d'aperçu (cookie).
// Stocké dans site_content (clé coming_soon) : absent = actif (site non lancé).

export const PREVIEW_COOKIE = "belavica_apercu";

export function previewToken() {
  const secret = process.env.APP_SECRET || "dev";
  return createHmac("sha256", secret).update("preview-v1").digest("base64url").slice(0, 32);
}

export async function comingSoonEnabled(): Promise<boolean> {
  const [row] = await db()<{ value: string }[]>`select value from site_content where key = 'coming_soon'`;
  return !row || row.value !== "0";
}

export async function hasPreviewAccess(): Promise<boolean> {
  const c = (await cookies()).get(PREVIEW_COOKIE)?.value;
  return !!c && c === previewToken();
}

/** Vrai si le visiteur doit voir la page d'attente. */
export async function isLockedForVisitor(): Promise<boolean> {
  if (!(await comingSoonEnabled())) return false;
  return !(await hasPreviewAccess());
}

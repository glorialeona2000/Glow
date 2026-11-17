import { createHmac } from "node:crypto";
import postgres from "postgres";
import { expect, type Page } from "@playwright/test";

export const sql = postgres("postgres://postgres:postgres@localhost:5432/belavica", { max: 2, onnotice: () => {} });
export const APP_SECRET = "local-dev-secret-local-dev-secret-0123456789";
export const CRON_SECRET = "local-cron-secret-0123456789abcdef";

export function manageLink(id: string) {
  const t = createHmac("sha256", APP_SECRET).update(`manage:${id}`).digest("base64url").slice(0, 32);
  return `/rdv/${id}.${t}`;
}

export async function login(page: Page, email = "leona@belavica.com", password = "test-password-123") {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

/** Parcours de réservation cliente jusqu'à l'écran de récapitulatif. */
export async function bookUntilReview(
  page: Page,
  opts: { category: string; service: string; variant?: string; option?: string; first?: string; email?: string; slotIndex?: number; dayIndex?: number },
) {
  await page.goto("/reservation");
  await page.getByRole("button", { name: new RegExp(opts.category) }).click();
  await page.getByRole("button", { name: new RegExp(opts.service) }).click();
  const optionsStep = page.getByText(/Options \(facultatif\)|Votre formule/).first();
  const calendar = page.getByRole("heading", { name: "Choisissez une date" });
  await expect(optionsStep.or(calendar)).toBeVisible();
  if (await optionsStep.isVisible()) {
    if (opts.variant) await page.getByText(opts.variant, { exact: true }).click();
    if (opts.option) await page.getByText(opts.option, { exact: true }).click();
    await page.getByRole("button", { name: "Continuer" }).click();
  }
  const days = page.locator("[aria-busy='false'] button:not([disabled])");
  await expect(days.first()).toBeVisible();
  await days.nth(opts.dayIndex ?? 0).click();
  const slots = page.locator("#creneaux button");
  await expect(slots.first()).toBeVisible();
  const slot = slots.nth(opts.slotIndex ?? 0);
  const label = await slot.innerText();
  await slot.click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByLabel("Prénom *", { exact: true }).fill(opts.first ?? "Camille");
  await page.getByLabel("Nom *", { exact: true }).fill("Test");
  await page.getByLabel("Téléphone *", { exact: true }).fill("+32 470 12 34 56");
  await page.getByLabel("E-mail *", { exact: true }).fill(opts.email ?? "camille.test@example.com");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Récapitulatif" })).toBeVisible();
  return label;
}

export async function loginOk(page: Page) {
  await login(page);
  await expect(page.getByRole("heading", { name: "Bonjour" })).toBeVisible();
}

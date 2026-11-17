import { expect, test } from "@playwright/test";
import { bookUntilReview, CRON_SECRET, login, loginOk, manageLink, sql } from "./helpers";

test.describe.configure({ mode: "serial" });

test("pages publiques accessibles, bouton Réserver visible sur mobile", async ({ page }) => {
  for (const path of ["/", "/prestations", "/contact", "/confidentialite", "/mentions-legales"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const bar = page.locator("div.fixed.bottom-0.z-30 a", { hasText: "Réserver un rendez-vous" });
  await expect(bar).toBeInViewport(); // accessible au pouce, sans défiler
  await page.mouse.wheel(0, 3000);
  await expect(bar).toBeInViewport();
  await page.goto("/prestations");
  await expect(page.getByText("Tarif bientôt disponible").first()).toBeVisible(); // pas de prix inventé
  await expect(page.getByText("Vous n’avez rien à choisir à l’avance", { exact: false })).toBeVisible();
});

test("réservation complète : variante + option French, récapitulatif et enregistrement", async ({ page }) => {
  const label = await bookUntilReview(page, {
    category: "Nails",
    service: "Manucure russe",
    variant: "Extension",
    option: "French manucure",
  });
  await expect(page.getByText("2 h 15", { exact: true })).toBeVisible(); // 120 + 15 min
  await expect(page.getByText("80 €", { exact: true })).toBeVisible(); // 70 + 10 €
  await expect(page.getByText("10 €", { exact: true }).first()).toBeVisible(); // acompte
  await expect(page.getByText("communiquée par message privé", { exact: false }).first()).toBeVisible();
  const confirm = page.getByRole("button", { name: "Confirmer" });
  await expect(confirm).toBeDisabled(); // consentement obligatoire
  await page.getByRole("checkbox").check();
  await page.waitForTimeout(4200); // protection anti-robot (envoi trop rapide refusé)
  await confirm.click();
  await expect(page.getByText("Demande de rendez-vous envoyée")).toBeVisible();
  await expect(page.getByText(/Référence BV-/)).toBeVisible();
  await expect(page.getByText("Un e-mail récapitulatif vient de vous être envoyé", { exact: false })).toBeVisible();

  const [b] = await sql`select b.* from bookings b join clients c on c.id = b.client_id where c.email = 'camille.test@example.com'`;
  expect(b.status).toBe("pending");
  expect(b.duration_min).toBe(135);
  expect(b.price_cents).toBe(8000);
  expect(b.deposit_cents).toBe(1000);
  expect(b.deposit_status).toBe("awaiting");
  expect(b.variant_name).toBe("Extension");
  expect(b.options[0].name).toBe("French manucure");
  expect(new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" }).format(b.starts_at)).toBe(label);
  const logs = await sql`select status from email_log where booking_id = ${b.id}`;
  expect(logs.map((l) => l.status).sort()).toEqual(["sent", "sent"]); // cliente + notification à leona@belavica.com
  const sent = await (await fetch("http://localhost:54321/__sent")).json();
  expect(sent.some((m: { to: string[]; subject: string }) => m.to[0] === "leona@belavica.com" && m.subject.includes("Nouvelle demande"))).toBe(true);
  expect(sent.some((m: { to: string[]; subject: string }) => m.to[0] === "camille.test@example.com" && m.subject.includes("Demande de rendez-vous reçue"))).toBe(true);
});

test("le créneau réservé n'est plus proposé (durée + temps tampon)", async ({ request }) => {
  const [b] = await sql`select service_id, variant_id, options, starts_at, block_until from bookings where status = 'pending' and kind = 'appointment' limit 1`;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(b.starts_at);
  const res = await request.get(`/api/availability?service=${b.service_id}&variant=${b.variant_id}&options=${b.options[0].id}&from=${day}&to=${day}`);
  const data = await res.json();
  const slots: string[] = (data.days[day] ?? []).map((s: { iso: string }) => s.iso);
  const start = b.starts_at.getTime();
  const blockEnd = b.block_until.getTime();
  for (const s of slots) {
    const t = new Date(s).getTime();
    const end = t + (135 + 15) * 60000;
    expect(t < blockEnd && start < end, `créneau ${s} chevauche`).toBe(false);
  }
});

test("deux clientes sur le même créneau au même moment : une seule réservation", async ({ browser }) => {
  const ctxA = await browser.newContext({ baseURL: "http://localhost:3000" });
  const ctxB = await browser.newContext({ baseURL: "http://localhost:3000" });
  const a = await ctxA.newPage();
  const bp = await ctxB.newPage();
  const opts = { category: "Lash & Brow", service: "Lash Lift avec coloration", dayIndex: 2, slotIndex: 1 };
  const la = await bookUntilReview(a, { ...opts, email: "alice@example.com", first: "Alice" });
  const lb = await bookUntilReview(bp, { ...opts, email: "berthe@example.com", first: "Berthe" });
  expect(la).toBe(lb);
  await a.getByRole("checkbox").check();
  await bp.getByRole("checkbox").check();
  await a.waitForTimeout(4200);
  await Promise.all([a.getByRole("button", { name: "Confirmer" }).click(), bp.getByRole("button", { name: "Confirmer" }).click()]);
  await a.waitForTimeout(2500);
  const ok = [await a.getByText("Demande de rendez-vous envoyée").isVisible(), await bp.getByText("Demande de rendez-vous envoyée").isVisible()];
  expect(ok.filter(Boolean)).toHaveLength(1);
  const loser = ok[0] ? bp : a;
  await expect(loser.getByText("vient d’être réservé", { exact: false })).toBeVisible();
  await expect(loser.getByRole("heading", { name: "Choisissez une date" })).toBeVisible(); // renvoyée au choix du créneau
  const rows = await sql`select count(*)::int as n from bookings b join clients c on c.id = b.client_id where c.email in ('alice@example.com','berthe@example.com')`;
  expect(rows[0].n).toBe(1);
  await ctxA.close();
  await ctxB.close();
});

test("échec d'envoi d'e-mail : jamais présenté comme envoyé, et journalisé", async ({ page }) => {
  await bookUntilReview(page, { category: "Nails", service: "Manucure semi-permanente", email: "echec@example.com", dayIndex: 4 });
  await page.getByRole("checkbox").check();
  await page.waitForTimeout(4200);
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByText("Demande de rendez-vous envoyée")).toBeVisible();
  await expect(page.getByText("n’a pas pu être envoyé", { exact: false })).toBeVisible();
  await expect(page.getByText("vient de vous être envoyé", { exact: false })).toHaveCount(0);
  const logs = await sql`select l.status, l.error from email_log l join bookings b on b.id = l.booking_id join clients c on c.id = b.client_id
                         where c.email = 'echec@example.com' and l.recipient = 'echec@example.com'`;
  expect(logs[0].status).toBe("failed");
  expect(logs[0].error).toContain("Destinataire refusé");
});

test("demande de formation (planification personnalisée)", async ({ page }) => {
  await page.goto("/reservation");
  await page.getByRole("button", { name: /Make-up/ }).click();
  await page.getByRole("button", { name: /Formation maquillage — 10 heures/ }).click();
  await expect(page.getByLabel("Vos disponibilités et objectifs *")).toBeVisible();
  await page.getByLabel("Prénom *", { exact: true }).fill("Dina");
  await page.getByLabel("Nom *", { exact: true }).fill("Formation");
  await page.getByLabel("Téléphone *", { exact: true }).fill("+352 621 123 456");
  await page.getByLabel("E-mail *", { exact: true }).fill("dina@example.com");
  await page.getByLabel("Vos disponibilités et objectifs *").fill("Le samedi matin, niveau débutante");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("checkbox").check();
  await page.waitForTimeout(4200);
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Demande envoyée")).toBeVisible();
  const [b] = await sql`select b.* from bookings b join clients c on c.id = b.client_id where c.email = 'dina@example.com'`;
  expect(b.kind).toBe("request");
  expect(b.starts_at).toBeNull();
  expect(b.preferred_schedule).toContain("samedi");
});

test("champ piège anti-robot", async ({ page }) => {
  await bookUntilReview(page, { category: "Nails", service: "Manucure semi-permanente", email: "robot@example.com", dayIndex: 3 });
  await page.getByRole("button", { name: "Étape précédente" }).click();
  await page.locator("input[tabindex='-1']").fill("http://spam.example", { force: true });
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("checkbox").check();
  await page.waitForTimeout(4200);
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  const rows = await sql`select 1 from clients where email = 'robot@example.com'`;
  expect(rows).toHaveLength(0);
});

test("espace admin protégé", async ({ page, request }) => {
  for (const p of ["/admin", "/admin/clientes", "/admin/reservations", "/admin/parametres"]) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/admin\/login/);
  }
  await login(page, "leona@belavica.com", "mauvais-mot-de-passe");
  await expect(page.getByText("Identifiants incorrects.")).toBeVisible();
  await login(page, "intrus@example.com");
  await expect(page.getByText("n’a pas accès", { exact: false })).toBeVisible();
  await page.goto("/admin/clientes");
  await expect(page).toHaveURL(/\/admin\/login/);
  expect((await request.post("/api/cron")).status()).toBe(401);
  expect((await request.post("/api/cron", { headers: { authorization: "Bearer mauvais" } })).status()).toBe(401);
  const ok = await request.post("/api/cron", { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  expect(ok.status()).toBe(200);
});

test("admin : accepter, modifier, notes, puis annulation par la cliente", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Bonjour" })).toBeVisible();
  await expect(page.getByText("Demandes en attente", { exact: false })).toBeVisible();
  const [b] = await sql`select b.id from bookings b join clients c on c.id = b.client_id where c.email = 'camille.test@example.com'`;
  await page.goto(`/admin/reservations/${b.id}`);
  await page.getByRole("button", { name: "Accepter et confirmer" }).click();
  await expect(page.getByText("Rendez-vous confirmé.", { exact: false })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "E-mail envoyé à la cliente." })).toBeVisible();
  expect((await sql`select status from bookings where id = ${b.id}`)[0].status).toBe("confirmed");

  // Modification : déplacer à J+20 à 10:00
  const d = new Date(Date.now() + 20 * 86400000);
  const ds = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(d);
  await page.locator("input[name=date]").fill(ds);
  await page.locator("input[name=time]").fill("10:00");
  await page.getByRole("button", { name: "Enregistrer" }).first().click();
  await expect(page.getByText("Rendez-vous mis à jour.", { exact: false })).toBeVisible();
  const [moved] = await sql`select starts_at from bookings where id = ${b.id}`;
  expect(new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" }).format(moved.starts_at)).toBe("10:00");

  // Acompte reçu + note interne
  await page.locator("select[name=deposit_status]").selectOption("received");
  await page.locator("textarea[name=admin_note]").fill("Préfère forme amande");
  await page.getByRole("button", { name: "Enregistrer" }).nth(1).click();
  await expect(page.getByText("Enregistré.")).toBeVisible();

  // Annulation par la cliente (> 48 h : gratuite)
  await page.goto(manageLink(b.id));
  await expect(page.getByText("Confirmé")).toBeVisible();
  await page.getByRole("button", { name: "Annuler mon rendez-vous" }).click();
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByText("Ce rendez-vous a été annulé.", { exact: false })).toBeVisible();
  const [c] = await sql`select status, late_cancellation, deposit_status, cancelled_by from bookings where id = ${b.id}`;
  expect(c).toMatchObject({ status: "cancelled", late_cancellation: false, deposit_status: "received", cancelled_by: "client" });
  // l'admin voit l'alerte de remboursement
  await page.goto(`/admin/reservations/${b.id}`);
  await expect(page.getByText("acompte reçu est à rembourser", { exact: false })).toBeVisible();
  // lien falsifié refusé
  const bad = await page.goto(`/rdv/${b.id}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`);
  expect(bad?.status()).toBe(404);
});

test("admin : rendez-vous manuel, chevauchement refusé, annulation tardive", async ({ page }) => {
  await loginOk(page);
  const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date(Date.now() + 86400000));
  const create = async (time: string, email: string) => {
    await page.goto("/admin/reservations/nouvelle");
    await page.locator("select[name=service_id]").selectOption({ label: "Lash & Brow · Lash Lift avec coloration des cils" });
    await page.locator("input[name=date]").fill(tomorrow);
    await page.locator("input[name=time]").fill(time);
    await page.locator("input[name=first_name]").fill("Eva");
    await page.locator("input[name=last_name]").fill("Manuel");
    await page.locator("input[name=phone]").fill("+32 470 00 00 00");
    await page.locator("input[name=email]").fill(email);
    await page.getByRole("button", { name: "Créer le rendez-vous" }).click();
  };
  await create("15:00", "eva@example.com");
  await expect(page.getByText("Rendez-vous créé.")).toBeVisible();
  const id = page.url().split("/").pop()!.split("?")[0];
  await create("15:30", "autre@example.com");
  await expect(page.getByText("chevauche un autre rendez-vous", { exact: false })).toBeVisible();

  // Annulation à moins de 48 h : case obligatoire, acompte conservé
  await page.goto(manageLink(id));
  await page.getByRole("button", { name: "Annuler mon rendez-vous" }).click();
  const confirm = page.getByRole("button", { name: "Confirmer" });
  await expect(confirm).toBeDisabled();
  await page.getByRole("checkbox").check();
  await confirm.click();
  await expect(page.getByRole("status").filter({ hasText: "Ce rendez-vous a été annulé. L’annulation étant intervenue tardivement" })).toBeVisible();
  const [c] = await sql`select late_cancellation, deposit_status from bookings where id = ${id}`;
  expect(c).toMatchObject({ late_cancellation: true, deposit_status: "forfeited" });
});

test("admin : prix, visibilité, congés et agenda", async ({ page, request }) => {
  await loginOk(page);
  const [svc] = await sql`select id from services where name = 'Brow Lift sans coloration'`;
  await page.goto(`/admin/prestations/${svc.id}`);
  await page.locator("input[name=price]").first().fill("35");
  await page.locator("input[name=duration_min]").first().fill("40");
  await page.getByRole("button", { name: "Enregistrer" }).first().click();
  await expect(page.getByText("Prestation enregistrée.")).toBeVisible();
  await page.goto("/prestations#lash-brow");
  await expect(page.locator("li", { hasText: "Brow Lift sans coloration" }).getByText("35 €")).toBeVisible();

  // masquer
  await page.goto(`/admin/prestations/${svc.id}`);
  await page.getByLabel("Visible sur le site").uncheck();
  await page.getByRole("button", { name: "Enregistrer" }).first().click();
  await expect(page.getByText("Prestation enregistrée.")).toBeVisible();
  await page.goto("/prestations");
  await expect(page.getByText("Brow Lift sans coloration")).toHaveCount(0);

  // congés sur J+10 : plus aucun créneau ce jour-là
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date(Date.now() + 10 * 86400000));
  const [lash] = await sql`select id from services where name = 'Lash Lift avec coloration des cils'`;
  const before = await (await request.get(`/api/availability?service=${lash.id}&from=${day}&to=${day}`)).json();
  expect(before.days[day]?.length ?? 0).toBeGreaterThan(0);
  await page.goto("/admin/disponibilites");
  await page.getByRole("button", { name: "Congés / absence" }).click();
  await page.locator("input[name=start_date]").fill(day);
  await page.locator("input[name=end_date]").fill(day);
  await page.locator("input[name=reason]").fill("Formation");
  await page.locator("form", { has: page.locator("input[name=end_date]") }).getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Congés enregistrés.", { exact: false })).toBeVisible();
  const after = await (await request.get(`/api/availability?service=${lash.id}&from=${day}&to=${day}`)).json();
  expect(after.days[day]).toBeUndefined();

  for (const v of ["jour", "semaine", "mois"]) {
    const r = await page.goto(`/admin/agenda?vue=${v}`);
    expect(r?.status()).toBe(200);
  }
  await page.goto("/admin/clientes?q=camille");
  await expect(page.getByText("camille.test@example.com", { exact: false })).toBeVisible();
});

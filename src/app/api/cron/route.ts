import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/data";
import { notifyStatus } from "@/lib/bookings";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 24) return false;
  const given = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Tâches planifiées (appelées toutes les heures par GitHub Actions) :
 * rappels, purge RGPD, nettoyage. L'appel garde aussi la base Supabase active.
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sql = db();
  const settings = await getSettings();
  const report: Record<string, number> = { reminders: 0, reminderFailures: 0, purgedClients: 0 };

  if (settings.reminders_enabled) {
    const due = await sql<{ id: string }[]>`
      select id from bookings
      where status = 'confirmed' and reminder_sent_at is null and starts_at > now()
        and starts_at <= now() + make_interval(hours => ${settings.reminder_hours_before})
        and created_at < now() - interval '2 hours'
      limit 30`;
    for (const b of due) {
      const r = await notifyStatus(b.id, "reminder");
      if (r.client?.status === "sent") {
        await sql`update bookings set reminder_sent_at = now() where id = ${b.id}`;
        report.reminders++;
      } else report.reminderFailures++;
    }
  }

  // Purge RGPD : fiches sans rendez-vous récent ni à venir
  const purged = await sql<{ id: string }[]>`
    delete from clients c
    where c.created_at < now() - make_interval(months => ${settings.retention_months})
      and not exists (
        select 1 from bookings b where b.client_id = c.id
          and (coalesce(b.starts_at, b.created_at) > now() - make_interval(months => ${settings.retention_months})
               or b.status in ('pending','confirmed'))
      )
    returning c.id`;
  report.purgedClients = purged.length;
  await sql`update bookings set client_comment = '', preferred_schedule = '', ip_hash = null
            where client_id is null and (client_comment <> '' or preferred_schedule <> '' or ip_hash is not null)`;
  await sql`update bookings set ip_hash = null where ip_hash is not null and created_at < now() - interval '30 days'`;
  await sql`delete from email_log where created_at < now() - interval '12 months'`;
  await sql`delete from job_runs where created_at < now() - interval '90 days'`;
  await sql`delete from media m where created_at < now() - interval '1 day'
            and not exists (select 1 from gallery_items g where g.image_url like '/media/' || m.id || '%')
            and not exists (select 1 from categories c where c.image_url like '/media/' || m.id || '%')
            and not exists (select 1 from site_content s where s.value like '/media/' || m.id || '%')`;
  await sql`insert into job_runs (job, detail) values ('cron', ${JSON.stringify(report)})`;
  return NextResponse.json({ ok: true, ...report });
}

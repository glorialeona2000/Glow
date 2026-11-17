import { db } from "@/lib/db";
import { getSettings } from "@/lib/data";
import { emailConfigured } from "@/lib/email";
import { turnstileEnabled, siteUrl } from "@/lib/security";
import { formatDateShort, formatTime } from "@/lib/time";
import { centsToInput } from "@/lib/money";
import { Card, PageTitle } from "@/components/admin/ui";
import { SettingsForm, TestEmail } from "./SettingsForms";
import { LaunchCard } from "./LaunchCard";
import { comingSoonEnabled, previewToken } from "@/lib/launch";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const [settings, soon] = await Promise.all([getSettings(), comingSoonEnabled()]);
  const sql = db();
  const [log, jobs] = await Promise.all([
    sql<{ id: string; kind: string; recipient: string; status: string; error: string | null; created_at: Date; booking_id: string | null }[]>`
      select id, kind, recipient, status, error, created_at, booking_id from email_log order by created_at desc limit 40`,
    sql<{ job: string; detail: string; created_at: Date }[]>`select job, detail, created_at from job_runs order by created_at desc limit 5`,
  ]);
  const tz = settings.timezone;
  const checks: [string, boolean, string][] = [
    ["Base de données", true, "Connectée"],
    ["E-mails (Resend)", emailConfigured(), emailConfigured() ? "Configuré" : "RESEND_API_KEY manquante"],
    ["Anti-robot (Turnstile)", turnstileEnabled(), turnstileEnabled() ? "Actif" : "Inactif (piège + limite par heure actifs)"],
    ["Tâches automatiques", jobs.length > 0, jobs.length ? `Dernière exécution ${formatDateShort(jobs[0].created_at, tz)} ${formatTime(jobs[0].created_at, tz)}` : "Jamais exécutées"],
    ["Adresse du site", !siteUrl().includes("localhost"), siteUrl()],
  ];
  return (
    <>
      <PageTitle title="Paramètres" />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <SettingsForm
          s={{
            notification_email: settings.notification_email,
            deposit_enabled: settings.deposit_enabled,
            deposit: centsToInput(settings.deposit_cents),
            cancellation_hours: settings.cancellation_hours,
            reminders_enabled: settings.reminders_enabled,
            reminder_hours_before: settings.reminder_hours_before,
            retention_months: settings.retention_months,
            max_requests_per_hour: settings.max_requests_per_hour,
          }}
        />
        <div className="space-y-6">
          <LaunchCard soon={soon} previewUrl={`/apercu?code=${previewToken()}`} />
          <Card title="État technique">
            <ul className="space-y-2 text-sm">
              {checks.map(([k, ok, v]) => (
                <li key={k} className="flex justify-between gap-4">
                  <span>{k}</span>
                  <span className={`text-right ${ok ? "text-success" : "text-warning"}`}>{v}</span>
                </li>
              ))}
            </ul>
            <TestEmail />
          </Card>
          <Card title="Journal des e-mails">
            <div id="journal" className="scroll-mt-28" />
            {log.length ? (
              <ul className="max-h-[480px] space-y-2 overflow-y-auto text-xs">
                {log.map((l) => (
                  <li key={l.id} className="border-b border-ink/10 pb-2">
                    <span className={l.status === "sent" ? "text-success" : l.status === "failed" ? "text-danger" : "text-mute"}>
                      {l.status === "sent" ? "Envoyé" : l.status === "failed" ? "Échec" : "Non envoyé"}
                    </span>{" "}
                    · {l.kind} · {l.recipient}
                    <span className="block text-mute">{formatDateShort(l.created_at, tz)} {formatTime(l.created_at, tz)}</span>
                    {l.error && <span className="block text-danger">{l.error}</span>}
                    {l.booking_id && <a className="underline" href={`/admin/reservations/${l.booking_id}`}>Voir la réservation</a>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-mute">Aucun e-mail pour l’instant.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

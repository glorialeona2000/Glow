import { getSchedule, getSettings } from "@/lib/data";
import { timeOffBetween } from "@/lib/admin-data";
import { WEEKDAYS_FR, formatDateShort, formatTime, now } from "@/lib/time";
import { PageTitle } from "@/components/admin/ui";
import { AvailabilityForms } from "./AvailabilityForms";

export const metadata = { title: "Disponibilités" };

export default async function AvailabilityPage() {
  const [schedule, settings, off] = await Promise.all([
    getSchedule(),
    getSettings(),
    timeOffBetween(new Date(now().getTime() - 86400000), new Date(now().getTime() + 400 * 86400000)),
  ]);
  const tz = settings.timezone;
  return (
    <>
      <PageTitle title="Disponibilités" sub="Horaires, pauses, congés et règles de réservation. Fuseau horaire : Europe/Bruxelles." />
      <AvailabilityForms
        hours={schedule.hours.map((h) => ({ ...h, day: WEEKDAYS_FR[h.weekday] }))}
        breaks={schedule.breaks.map((h) => ({ ...h, day: WEEKDAYS_FR[h.weekday] }))}
        off={off.map((o) => ({
          id: o.id,
          kind: o.kind,
          reason: o.reason,
          label:
            o.kind === "vacation"
              ? `${formatDateShort(o.starts_at, tz)} → ${formatDateShort(new Date(o.ends_at.getTime() - 1), tz)}`
              : `${formatDateShort(o.starts_at, tz)} · ${formatTime(o.starts_at, tz)}–${formatTime(o.ends_at, tz)}`,
        }))}
        rules={{
          slot_interval_min: settings.slot_interval_min,
          buffer_min: settings.buffer_min,
          min_notice_hours: settings.min_notice_hours,
          max_days_ahead: settings.max_days_ahead,
        }}
      />
    </>
  );
}

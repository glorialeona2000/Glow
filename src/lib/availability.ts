// Moteur de disponibilités (pur, sans base de données) : utilisé à la fois pour
// afficher les créneaux et pour revérifier côté serveur au moment de la réservation.
import { addDays, daysBetween, isoWeekday, timeToMinutes, toDateStr, zonedToUtc, TZ } from "./time";

export type WeeklyRange = { weekday: number; start_time: string; end_time: string };
export type Interval = { start: Date; end: Date };

export type AvailabilityRules = {
  tz?: string;
  slotIntervalMin: number;
  bufferMin: number;
  minNoticeHours: number;
  maxDaysAhead: number;
};

export type AvailabilityInput = AvailabilityRules & {
  durationMin: number;
  now: Date;
  workingHours: WeeklyRange[];
  breaks: WeeklyRange[];
  timeOff: Interval[];
  /** Rendez-vous actifs : [début, fin + tampon) */
  busy: Interval[];
};

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

/** Premier et dernier jour réservables (dates locales). */
export function bookableWindow(now: Date, rules: AvailabilityRules) {
  const tz = rules.tz ?? TZ;
  const first = toDateStr(new Date(now.getTime() + rules.minNoticeHours * 3600_000), tz);
  const last = addDays(toDateStr(now, tz), rules.maxDaysAhead);
  return { first, last };
}

/** Créneaux de début possibles pour une date locale donnée. */
export function slotsForDate(dateStr: string, input: AvailabilityInput): Date[] {
  const tz = input.tz ?? TZ;
  const { durationMin, bufferMin, slotIntervalMin } = input;
  if (durationMin <= 0 || slotIntervalMin <= 0) return [];

  const today = toDateStr(input.now, tz);
  if (daysBetween(today, dateStr) > input.maxDaysAhead) return [];
  if (daysBetween(today, dateStr) < 0) return [];

  const earliest = input.now.getTime() + input.minNoticeHours * 3600_000;
  const wd = isoWeekday(dateStr);
  const ranges = input.workingHours.filter((r) => r.weekday === wd);
  if (!ranges.length) return [];

  const dayBreaks = input.breaks
    .filter((b) => b.weekday === wd)
    .map((b) => [
      zonedToUtc(dateStr, timeToMinutes(b.start_time), tz).getTime(),
      zonedToUtc(dateStr, timeToMinutes(b.end_time), tz).getTime(),
    ]);
  const off = input.timeOff.map((t) => [t.start.getTime(), t.end.getTime()]);
  const busy = input.busy.map((b) => [b.start.getTime(), b.end.getTime()]);

  const result = new Map<number, Date>();
  for (const r of ranges) {
    const open = timeToMinutes(r.start_time);
    const close = timeToMinutes(r.end_time);
    for (let m = open; m + durationMin <= close; m += slotIntervalMin) {
      const s = zonedToUtc(dateStr, m, tz).getTime();
      const e = s + durationMin * 60_000;
      const block = e + bufferMin * 60_000;
      if (s < earliest) continue;
      if (dayBreaks.some(([bs, be]) => overlaps(s, e, bs, be))) continue;
      if (off.some(([os, oe]) => overlaps(s, e, os, oe))) continue;
      // même règle que la contrainte d'exclusion en base : [début, fin+tampon)
      if (busy.some(([bs, bu]) => overlaps(s, block, bs, bu))) continue;
      result.set(s, new Date(s));
    }
  }
  return [...result.values()].sort((a, b) => a.getTime() - b.getTime());
}

/** Créneaux sur une plage de dates (incluses). */
export function slotsForRange(from: string, to: string, input: AvailabilityInput): Record<string, Date[]> {
  const out: Record<string, Date[]> = {};
  for (let d = from; daysBetween(d, to) >= 0; d = addDays(d, 1)) {
    const s = slotsForDate(d, input);
    if (s.length) out[d] = s;
  }
  return out;
}

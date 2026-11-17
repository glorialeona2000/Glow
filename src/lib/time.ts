// Utilitaires de fuseau horaire sans dépendance (Europe/Brussels par défaut).

export const TZ = "Europe/Brussels";

/** Instant présent (fonction dédiée pour les composants serveur). */
export function now() {
  return new Date();
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dtfCache.set(tz, f);
  }
  return f;
}

export function zonedParts(date: Date, tz = TZ): Parts {
  const out: Record<string, number> = {};
  for (const p of dtf(tz).formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
  };
}

/** Décalage (ms) du fuseau par rapport à UTC à un instant donné. */
export function tzOffsetMs(date: Date, tz = TZ): number {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convertit une date locale (YYYY-MM-DD) + minutes depuis minuit en instant UTC. */
export function zonedToUtc(dateStr: string, minutesOfDay: number, tz = TZ): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, 0, minutesOfDay, 0);
  let guess = naive - tzOffsetMs(new Date(naive), tz);
  // seconde passe pour les changements d'heure
  guess = naive - tzOffsetMs(new Date(guess), tz);
  return new Date(guess);
}

export function toDateStr(date: Date, tz = TZ): string {
  const p = zonedParts(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function minutesOfDay(date: Date, tz = TZ): number {
  const p = zonedParts(date, tz);
  return p.hour * 60 + p.minute;
}

/** 1 = lundi … 7 = dimanche */
export function isoWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// --- Formatage français -----------------------------------------------------

export function formatDateLong(date: Date, tz = TZ) {
  return new Intl.DateTimeFormat("fr-BE", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}
export function formatDateShort(date: Date, tz = TZ) {
  return new Intl.DateTimeFormat("fr-BE", { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(date);
}
export function formatTime(date: Date, tz = TZ) {
  return new Intl.DateTimeFormat("fr-BE", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(date);
}
export function formatDateStrLong(dateStr: string) {
  return formatDateLong(zonedToUtc(dateStr, 12 * 60));
}
export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} h ${pad(m)}`;
  if (h) return `${h} h`;
  return `${m} min`;
}
export const WEEKDAYS_FR = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

import Link from "next/link";
import { bookingsBetween, timeOffBetween, type BookingRow, type TimeOffRow } from "@/lib/admin-data";
import { getSchedule, getSettings } from "@/lib/data";
import {
  addDays,
  formatDateLong,
  formatTime,
  isoWeekday,
  isValidDateStr,
  minutesOfDay,
  timeToMinutes,
  toDateStr,
  zonedToUtc,
} from "@/lib/time";
import { BookingCard } from "@/components/admin/BookingCard";
import { Card, Empty, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Agenda" };

type View = "jour" | "semaine" | "mois";
const DAY_SHORT = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const BLOCK_STYLE: Record<string, string> = {
  pending: "border-warning bg-[#f6ecd9] text-ink",
  confirmed: "border-ink bg-ink text-ivory",
  completed: "border-stone bg-sand text-taupe",
  no_show: "border-danger/40 bg-danger/10 text-danger",
};

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ vue?: string; date?: string }> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  const tz = settings.timezone;
  const today = toDateStr(new Date(), tz);
  const view: View = sp.vue === "jour" || sp.vue === "mois" ? sp.vue : "semaine";
  const date = sp.date && isValidDateStr(sp.date) ? sp.date : today;

  let from: string, to: string, prev: string, next: string, title: string;
  if (view === "jour") {
    from = date;
    to = addDays(date, 1);
    prev = addDays(date, -1);
    next = addDays(date, 1);
    title = formatDateLong(zonedToUtc(date, 720, tz), tz);
  } else if (view === "semaine") {
    from = addDays(date, 1 - isoWeekday(date));
    to = addDays(from, 7);
    prev = addDays(from, -7);
    next = addDays(from, 7);
    const a = zonedToUtc(from, 720, tz);
    const z = zonedToUtc(addDays(from, 6), 720, tz);
    title = `Semaine du ${new Intl.DateTimeFormat("fr-BE", { timeZone: tz, day: "numeric", month: "short" }).format(a)} au ${new Intl.DateTimeFormat("fr-BE", { timeZone: tz, day: "numeric", month: "short", year: "numeric" }).format(z)}`;
  } else {
    const [y, m] = date.split("-").map(Number);
    from = `${y}-${String(m).padStart(2, "0")}-01`;
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    to = addDays(`${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`, 1);
    prev = m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
    next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    title = `${MONTHS[m - 1]} ${y}`;
  }

  const fromD = zonedToUtc(from, 0, tz);
  const toD = zonedToUtc(to, 0, tz);
  const [bookings, off, schedule] = await Promise.all([bookingsBetween(fromD, toD), timeOffBetween(fromD, toD), getSchedule()]);
  const byDay = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const d = toDateStr(b.starts_at!, tz);
    byDay.set(d, [...(byDay.get(d) ?? []), b]);
  }
  const offFor = (d: string) =>
    off.filter((o) => o.starts_at < zonedToUtc(addDays(d, 1), 0, tz) && o.ends_at > zonedToUtc(d, 0, tz));

  const href = (v: View, d: string) => `/admin/agenda?vue=${v}&date=${d}`;

  return (
    <>
      <PageTitle
        title="Agenda"
        actions={
          <>
            <Link href={`/admin/reservations/nouvelle?date=${view === "jour" ? date : ""}`} className="btn btn-primary min-h-11 px-5">+ Rendez-vous</Link>
            <Link href="/admin/disponibilites#bloquer" className="btn btn-outline min-h-11 px-5">Bloquer</Link>
          </>
        }
      />
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Link href={href(view, prev)} className="btn btn-outline min-h-10 px-3" aria-label="Précédent">←</Link>
          <Link href={href(view, today)} className="btn btn-outline min-h-10 px-4">Aujourd’hui</Link>
          <Link href={href(view, next)} className="btn btn-outline min-h-10 px-3" aria-label="Suivant">→</Link>
          <h2 className="display ml-2 text-xl first-letter:uppercase">{title}</h2>
        </div>
        <div className="flex border border-ink/15 bg-white">
          {(["jour", "semaine", "mois"] as View[]).map((v) => (
            <Link key={v} href={href(v, date)} className={`flex-1 px-4 py-2 text-center text-xs tracking-[0.14em] uppercase ${v === view ? "bg-ink text-ivory" : ""}`}>
              {v}
            </Link>
          ))}
        </div>
      </div>

      {view === "mois" && <MonthGrid from={from} to={to} today={today} byDay={byDay} off={offFor} href={href} />}

      {view !== "mois" && (
        <>
          <div className="hidden md:block">
            <TimeGrid
              days={view === "jour" ? [date] : Array.from({ length: 7 }, (_, i) => addDays(from, i))}
              byDay={byDay}
              off={offFor}
              tz={tz}
              today={today}
              hours={schedule.hours}
              breaks={schedule.breaks}
              href={href}
            />
          </div>
          <div className="space-y-4 md:hidden">
            {(view === "jour" ? [date] : Array.from({ length: 7 }, (_, i) => addDays(from, i))).map((d) => (
              <Card key={d} title={<span className="text-base first-letter:uppercase">{formatDateLong(zonedToUtc(d, 720, tz), tz)}</span>}>
                {offFor(d).map((o) => (
                  <OffLine key={o.id} o={o} tz={tz} />
                ))}
                {(byDay.get(d) ?? []).length ? (byDay.get(d) ?? []).map((b) => <BookingCard key={b.id} b={b} showDate={false} />) : !offFor(d).length && <Empty>—</Empty>}
              </Card>
            ))}
          </div>
        </>
      )}
      <p className="mt-6 flex flex-wrap gap-4 text-xs text-mute">
        <span className="flex items-center gap-2"><span className="size-3 bg-ink" /> Confirmé</span>
        <span className="flex items-center gap-2"><span className="size-3 border border-warning bg-[#f6ecd9]" /> En attente</span>
        <span className="flex items-center gap-2"><span className="size-3 bg-[repeating-linear-gradient(45deg,#d9cfc2_0_4px,#ece5db_4px_8px)]" /> Bloqué / congé</span>
      </p>
    </>
  );
}

function OffLine({ o, tz }: { o: TimeOffRow; tz: string }) {
  return (
    <p className="mb-2 bg-[repeating-linear-gradient(45deg,#d9cfc2_0_4px,#ece5db_4px_8px)] px-3 py-2 text-xs">
      {o.kind === "vacation" ? "Congés" : `Bloqué ${formatTime(o.starts_at, tz)}–${formatTime(o.ends_at, tz)}`}
      {o.reason ? ` · ${o.reason}` : ""}
    </p>
  );
}

function TimeGrid({
  days,
  byDay,
  off,
  tz,
  today,
  hours,
  breaks,
  href,
}: {
  days: string[];
  byDay: Map<string, BookingRow[]>;
  off: (d: string) => TimeOffRow[];
  tz: string;
  today: string;
  hours: { weekday: number; start_time: string; end_time: string }[];
  breaks: { weekday: number; start_time: string; end_time: string }[];
  href: (v: View, d: string) => string;
}) {
  // Plage horaire affichée : horaires de travail et rendez-vous, au minimum 8h–20h
  let startMin = 8 * 60;
  let endMin = 20 * 60;
  for (const h of hours) {
    startMin = Math.min(startMin, timeToMinutes(h.start_time));
    endMin = Math.max(endMin, timeToMinutes(h.end_time));
  }
  for (const d of days)
    for (const b of byDay.get(d) ?? []) {
      startMin = Math.min(startMin, minutesOfDay(b.starts_at!, tz));
      endMin = Math.max(endMin, minutesOfDay(b.ends_at!, tz) || 24 * 60);
    }
  startMin = Math.floor(startMin / 60) * 60;
  endMin = Math.ceil(endMin / 60) * 60;
  const total = endMin - startMin;
  const pxPerMin = 1.1;
  const pct = (m: number) => `${((m - startMin) / total) * 100}%`;
  const hoursList = Array.from({ length: total / 60 + 1 }, (_, i) => startMin + i * 60);

  return (
    <div className="overflow-x-auto border border-ink/10 bg-white">
      <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="border-b border-ink/10" />
        {days.map((d) => (
          <Link key={d} href={href("jour", d)} className={`border-b border-l border-ink/10 px-2 py-3 text-center text-xs ${d === today ? "bg-sand" : ""}`}>
            <span className="tracking-[0.14em] uppercase text-mute">{DAY_SHORT[isoWeekday(d)]}</span>{" "}
            <span className="font-medium">{Number(d.slice(8))}</span>
          </Link>
        ))}
        <div className="relative" style={{ height: total * pxPerMin }}>
          {hoursList.map((m) => (
            <span key={m} className="absolute right-2 -translate-y-1/2 text-[0.65rem] text-mute" style={{ top: pct(m) }}>
              {String(m / 60).padStart(2, "0")}h
            </span>
          ))}
        </div>
        {days.map((d) => {
          const wd = isoWeekday(d);
          const open = hours.filter((h) => h.weekday === wd);
          return (
            <div key={d} className="relative border-l border-ink/10 bg-cream" style={{ height: total * pxPerMin }}>
              {open.map((h, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 bg-white"
                  style={{ top: pct(timeToMinutes(h.start_time)), height: `${((timeToMinutes(h.end_time) - timeToMinutes(h.start_time)) / total) * 100}%` }}
                />
              ))}
              {breaks
                .filter((h) => h.weekday === wd)
                .map((h, i) => (
                  <div
                    key={`b${i}`}
                    className="absolute inset-x-0 bg-sand/70"
                    style={{ top: pct(timeToMinutes(h.start_time)), height: `${((timeToMinutes(h.end_time) - timeToMinutes(h.start_time)) / total) * 100}%` }}
                  />
                ))}
              {hoursList.map((m) => (
                <div key={m} className="absolute inset-x-0 border-t border-ink/5" style={{ top: pct(m) }} />
              ))}
              {off(d).map((o) => {
                const dayStart = zonedToUtc(d, 0, tz);
                const s = Math.max(startMin, o.starts_at <= dayStart ? 0 : minutesOfDay(o.starts_at, tz));
                const e = Math.min(endMin, o.ends_at >= zonedToUtc(addDays(d, 1), 0, tz) ? 24 * 60 : minutesOfDay(o.ends_at, tz));
                if (e <= s) return null;
                return (
                  <div
                    key={o.id}
                    title={o.reason}
                    className="absolute inset-x-0.5 overflow-hidden bg-[repeating-linear-gradient(45deg,#d9cfc2_0_4px,#ece5db_4px_8px)] p-1 text-[0.65rem] text-taupe"
                    style={{ top: pct(s), height: `${((e - s) / total) * 100}%` }}
                  >
                    {o.kind === "vacation" ? "Congés" : "Bloqué"} {o.reason}
                  </div>
                );
              })}
              {(byDay.get(d) ?? []).map((b) => {
                const s = minutesOfDay(b.starts_at!, tz);
                const e = Math.max(s + 15, minutesOfDay(b.ends_at!, tz) || 24 * 60);
                return (
                  <Link
                    key={b.id}
                    href={`/admin/reservations/${b.id}`}
                    className={`absolute inset-x-1 overflow-hidden border-l-2 px-1.5 py-1 text-[0.7rem] leading-tight shadow-sm hover:z-10 hover:shadow-md ${BLOCK_STYLE[b.status] ?? ""}`}
                    style={{ top: pct(s), height: `${((e - s) / total) * 100}%` }}
                  >
                    <span className="font-medium">{formatTime(b.starts_at!, tz)}</span> {b.first_name ?? ""}
                    <span className="block truncate opacity-80">{b.service_name}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({
  from,
  to,
  today,
  byDay,
  off,
  href,
}: {
  from: string;
  to: string;
  today: string;
  byDay: Map<string, BookingRow[]>;
  off: (d: string) => TimeOffRow[];
  href: (v: View, d: string) => string;
}) {
  const offset = isoWeekday(from) - 1;
  const days: string[] = [];
  for (let d = from; d < to; d = addDays(d, 1)) days.push(d);
  return (
    <div className="border border-ink/10 bg-white">
      <div className="grid grid-cols-7 border-b border-ink/10 text-center text-[0.65rem] tracking-[0.14em] uppercase text-mute">
        {DAY_SHORT.slice(1).map((d) => (
          <span key={d} className="py-2">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: offset }, (_, i) => (
          <div key={`e${i}`} className="min-h-20 border-b border-r border-ink/5 bg-cream md:min-h-28" />
        ))}
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          const pending = list.filter((b) => b.status === "pending").length;
          const isOff = off(d).length > 0;
          return (
            <Link
              key={d}
              href={href("jour", d)}
              className={`min-h-20 border-b border-r border-ink/5 p-1.5 text-xs hover:bg-cream md:min-h-28 md:p-2 ${isOff ? "bg-[repeating-linear-gradient(45deg,#f3eee7_0_6px,#fbf9f6_6px_12px)]" : ""}`}
            >
              <span className={`inline-flex size-6 items-center justify-center ${d === today ? "rounded-full bg-ink text-ivory" : ""}`}>{Number(d.slice(8))}</span>
              {list.length > 0 && (
                <>
                  <span className="mt-1 block md:hidden">
                    <span className="inline-block min-w-5 bg-ink px-1 text-center text-ivory">{list.length}</span>
                    {pending > 0 && <span className="ml-1 inline-block bg-warning/20 px-1 text-warning">{pending}</span>}
                  </span>
                  <ul className="mt-1 hidden space-y-0.5 md:block">
                    {list.slice(0, 4).map((b) => (
                      <li key={b.id} className={`truncate px-1 ${b.status === "pending" ? "bg-[#f6ecd9]" : "bg-sand"}`}>
                        {new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" }).format(b.starts_at!)} {b.first_name}
                      </li>
                    ))}
                    {list.length > 4 && <li className="text-mute">+{list.length - 4}</li>}
                  </ul>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import { describe, expect, it } from "vitest";
import { slotsForDate, bookableWindow } from "../../src/lib/availability";
import { zonedToUtc, formatTime, toDateStr } from "../../src/lib/time";

const base = {
  slotIntervalMin: 30,
  bufferMin: 15,
  minNoticeHours: 0,
  maxDaysAhead: 60,
  workingHours: [{ weekday: 2, start_time: "09:00", end_time: "13:00" }], // mardi
  breaks: [] as { weekday: number; start_time: string; end_time: string }[],
  timeOff: [] as { start: Date; end: Date }[],
  busy: [] as { start: Date; end: Date }[],
};
const now = new Date("2026-11-30T08:00:00Z"); // lundi
const times = (ds: Date[]) => ds.map((d) => formatTime(d));

describe("fuseau Europe/Brussels", () => {
  it("convertit en hiver (UTC+1) et en été (UTC+2)", () => {
    expect(zonedToUtc("2026-12-01", 9 * 60).toISOString()).toBe("2026-12-01T08:00:00.000Z");
    expect(zonedToUtc("2026-07-01", 9 * 60).toISOString()).toBe("2026-07-01T07:00:00.000Z");
  });
  it("gère les jours de changement d'heure", () => {
    expect(zonedToUtc("2026-03-29", 10 * 60).toISOString()).toBe("2026-03-29T08:00:00.000Z");
    expect(zonedToUtc("2026-10-25", 10 * 60).toISOString()).toBe("2026-10-25T09:00:00.000Z");
  });
  it("donne la date locale", () => {
    expect(toDateStr(new Date("2026-12-01T23:30:00Z"))).toBe("2026-12-02");
  });
});

describe("créneaux", () => {
  it("respecte les horaires et la durée", () => {
    const s = slotsForDate("2026-12-01", { ...base, durationMin: 60, now });
    expect(times(s)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"]);
  });
  it("jour fermé = aucun créneau", () => {
    expect(slotsForDate("2026-12-02", { ...base, durationMin: 60, now })).toEqual([]);
  });
  it("respecte les pauses", () => {
    const s = slotsForDate("2026-12-01", {
      ...base, durationMin: 60, now,
      breaks: [{ weekday: 2, start_time: "11:00", end_time: "11:30" }],
    });
    expect(times(s)).toEqual(["09:00", "09:30", "10:00", "11:30", "12:00"]);
  });
  it("bloque les rendez-vous existants + temps tampon des deux côtés", () => {
    const busy = [{ start: zonedToUtc("2026-12-01", 10 * 60), end: zonedToUtc("2026-12-01", 11 * 60 + 15) }];
    const s = slotsForDate("2026-12-01", { ...base, durationMin: 30, now, busy });
    // 09:30-10:00 + 15 min de tampon chevaucherait 10:00 -> exclu ; 11:30 ok (après 11:15)
    expect(times(s)).toEqual(["09:00", "11:30", "12:00", "12:30"]);
  });
  it("respecte les congés", () => {
    const timeOff = [{ start: zonedToUtc("2026-12-01", 0), end: zonedToUtc("2026-12-02", 0) }];
    expect(slotsForDate("2026-12-01", { ...base, durationMin: 30, now, timeOff })).toEqual([]);
  });
  it("respecte le délai minimum", () => {
    const n = zonedToUtc("2026-12-01", 8 * 60); // 08:00 locale
    const s = slotsForDate("2026-12-01", { ...base, durationMin: 60, now: n, minNoticeHours: 3 });
    expect(times(s)).toEqual(["11:00", "11:30", "12:00"]);
  });
  it("respecte la réservation maximale à l'avance", () => {
    expect(slotsForDate("2027-03-02", { ...base, durationMin: 60, now })).toEqual([]);
    const w = bookableWindow(now, base);
    expect(w.last).toBe("2027-01-29");
  });
  it("prestation plus longue que la journée = aucun créneau", () => {
    expect(slotsForDate("2026-12-01", { ...base, durationMin: 300, now })).toEqual([]);
  });
  it("jamais dans le passé", () => {
    expect(slotsForDate("2026-11-24", { ...base, durationMin: 30, now })).toEqual([]);
  });
});

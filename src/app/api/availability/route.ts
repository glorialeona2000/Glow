import { NextResponse, type NextRequest } from "next/server";
import { availableSlots, bookingErrorMessage, resolveSelection } from "@/lib/bookings";
import { bookableWindow } from "@/lib/availability";
import { getSettings } from "@/lib/data";
import { daysBetween, formatTime, isValidDateStr } from "@/lib/time";
import { isLockedForVisitor } from "@/lib/launch";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/;

/** GET /api/availability?service=…&variant=…&options=a,b&from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(req: NextRequest) {
  if (await isLockedForVisitor()) return NextResponse.json({ error: "Bientôt disponible" }, { status: 403 });
  const q = req.nextUrl.searchParams;
  const service = q.get("service") ?? "";
  const variant = q.get("variant") || null;
  const options = (q.get("options") || "").split(",").filter(Boolean);
  const from = q.get("from") ?? "";
  const to = q.get("to") ?? "";
  if (!UUID.test(service) || (variant && !UUID.test(variant)) || options.some((o) => !UUID.test(o))) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  if (!isValidDateStr(from) || !isValidDateStr(to) || daysBetween(from, to) < 0 || daysBetween(from, to) > 42) {
    return NextResponse.json({ error: "Période invalide" }, { status: 400 });
  }
  try {
    const [sel, settings] = await Promise.all([resolveSelection(service, variant, options), getSettings()]);
    if (!sel.durationMin) return NextResponse.json({ error: "Prestation sur demande" }, { status: 400 });
    const now = new Date();
    const window = bookableWindow(now, { ...settings, slotIntervalMin: settings.slot_interval_min, bufferMin: settings.buffer_min, minNoticeHours: settings.min_notice_hours, maxDaysAhead: settings.max_days_ahead, tz: settings.timezone });
    const start = daysBetween(window.first, from) >= 0 ? from : window.first;
    const end = daysBetween(to, window.last) >= 0 ? to : window.last;
    const days: Record<string, { iso: string; label: string }[]> = {};
    if (daysBetween(start, end) >= 0) {
      const slots = await availableSlots(sel.durationMin, start, end, { now });
      for (const [d, list] of Object.entries(slots)) {
        days[d] = list.map((s) => ({ iso: s.toISOString(), label: formatTime(s, settings.timezone) }));
      }
    }
    return NextResponse.json(
      { days, window, durationMin: sel.durationMin, priceCents: sel.priceCents },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: bookingErrorMessage(e) }, { status: 400 });
  }
}

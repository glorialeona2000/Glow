import "server-only";
import { db } from "./db";
import { withDefaults, type SiteContent } from "./content";
import type { Interval, WeeklyRange } from "./availability";

export type Settings = {
  timezone: string;
  slot_interval_min: number;
  buffer_min: number;
  min_notice_hours: number;
  max_days_ahead: number;
  deposit_enabled: boolean;
  deposit_cents: number;
  cancellation_hours: number;
  notification_email: string;
  reminders_enabled: boolean;
  reminder_hours_before: number;
  retention_months: number;
  max_requests_per_hour: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image_url: string | null;
  sort: number;
  visible: boolean;
};

export type Variant = {
  id: string;
  service_id: string;
  name: string;
  description: string;
  price_cents: number | null;
  duration_min: number | null;
  sort: number;
  visible: boolean;
};

export type Option = {
  id: string;
  name: string;
  description: string;
  price_cents: number | null;
  duration_min: number;
  active: boolean;
  sort: number;
};

export type Service = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  highlights: string[];
  note: string;
  price_cents: number | null;
  duration_min: number | null;
  booking_mode: "appointment" | "request" | "quote";
  requires_deposit: boolean;
  sort: number;
  visible: boolean;
  variants: Variant[];
  options: Option[];
};

export type CatalogCategory = Category & { services: Service[] };

export async function getSettings(): Promise<Settings> {
  const [s] = await db()<Settings[]>`
    select timezone, slot_interval_min, buffer_min, min_notice_hours, max_days_ahead,
           deposit_enabled, deposit_cents, cancellation_hours, notification_email,
           reminders_enabled, reminder_hours_before, retention_months, max_requests_per_hour
    from settings where id = 1`;
  return s;
}

export async function getContent(): Promise<SiteContent> {
  const rows = await db()<{ key: string; value: string }[]>`select key, value from site_content`;
  return withDefaults(rows);
}

/**
 * Catalogue complet. `publicOnly` : uniquement les éléments visibles et non archivés
 * (les options sans prix sont aussi masquées côté public).
 */
export async function getCatalog(publicOnly = true): Promise<CatalogCategory[]> {
  const sql = db();
  const [cats, services, variants, options, links] = await Promise.all([
    sql<Category[]>`select id, slug, name, tagline, description, image_url, sort, visible
                    from categories ${publicOnly ? sql`where visible` : sql``} order by sort, name`,
    sql<Omit<Service, "variants" | "options">[]>`
      select id, category_id, name, description, highlights, note, price_cents, duration_min,
             booking_mode, requires_deposit, sort, visible
      from services where archived_at is null ${publicOnly ? sql`and visible` : sql``}
      order by sort, name`,
    sql<Variant[]>`select id, service_id, name, description, price_cents, duration_min, sort, visible
                   from service_variants where archived_at is null ${publicOnly ? sql`and visible` : sql``}
                   order by sort, name`,
    sql<Option[]>`select id, name, description, price_cents, duration_min, active, sort
                  from service_options where archived_at is null
                  ${publicOnly ? sql`and active and price_cents is not null` : sql``}
                  order by sort, name`,
    sql<{ service_id: string; option_id: string }[]>`select service_id, option_id from service_option_links`,
  ]);
  const optById = new Map(options.map((o) => [o.id, o]));
  return cats.map((c) => ({
    ...c,
    services: services
      .filter((s) => s.category_id === c.id)
      .map((s) => ({
        ...s,
        variants: variants.filter((v) => v.service_id === s.id),
        options: links
          .filter((l) => l.service_id === s.id)
          .map((l) => optById.get(l.option_id))
          .filter((o): o is Option => !!o)
          .sort((a, b) => a.sort - b.sort),
      })),
  }));
}

/** Prix "à partir de" et durée affichables pour une prestation. */
export function servicePricing(s: Service) {
  if (s.variants.length) {
    const priced = s.variants.filter((v) => v.price_cents != null && v.duration_min != null);
    if (!priced.length) return { bookable: false, fromPrice: null as number | null, duration: null as number | null, hasVariants: true };
    return {
      bookable: true,
      fromPrice: Math.min(...priced.map((v) => v.price_cents!)),
      duration: Math.min(...priced.map((v) => v.duration_min!)),
      hasVariants: true,
    };
  }
  const bookable = s.booking_mode !== "appointment" || (s.price_cents != null && s.duration_min != null);
  return { bookable, fromPrice: s.price_cents, duration: s.duration_min, hasVariants: false };
}

export async function getSchedule() {
  const sql = db();
  const [hours, brks] = await Promise.all([
    sql<(WeeklyRange & { id: string })[]>`
      select id, weekday, to_char(start_time, 'HH24:MI') as start_time, to_char(end_time, 'HH24:MI') as end_time
      from working_hours order by weekday, start_time`,
    sql<(WeeklyRange & { id: string; label: string })[]>`
      select id, weekday, to_char(start_time, 'HH24:MI') as start_time, to_char(end_time, 'HH24:MI') as end_time, label
      from breaks order by weekday, start_time`,
  ]);
  return { hours, breaks: brks };
}

/** Rendez-vous actifs et absences sur une période. */
export async function getBusy(from: Date, to: Date, excludeBookingId?: string) {
  const sql = db();
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const [busy, off] = await Promise.all([
    sql<{ starts_at: Date; block_until: Date }[]>`
      select starts_at, block_until from bookings
      where status in ('pending','confirmed') and starts_at is not null
        and tstzrange(starts_at, block_until) && tstzrange(${fromIso}::timestamptz, ${toIso}::timestamptz)
        ${excludeBookingId ? sql`and id <> ${excludeBookingId}` : sql``}`,
    sql<{ starts_at: Date; ends_at: Date }[]>`
      select starts_at, ends_at from time_off
      where tstzrange(starts_at, ends_at) && tstzrange(${fromIso}::timestamptz, ${toIso}::timestamptz)`,
  ]);
  return {
    busy: busy.map((b): Interval => ({ start: b.starts_at, end: b.block_until })),
    timeOff: off.map((o): Interval => ({ start: o.starts_at, end: o.ends_at })),
  };
}

export type GalleryItem = { id: string; image_url: string; alt: string; category: string | null; sort: number; visible: boolean };

export async function getGallery(publicOnly = true) {
  const sql = db();
  return sql<GalleryItem[]>`select id, image_url, alt, category, sort, visible from gallery_items
                            ${publicOnly ? sql`where visible` : sql``} order by sort, created_at`;
}

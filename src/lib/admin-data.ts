import "server-only";
import { db } from "./db";

export type BookingRow = {
  id: string;
  ref: string;
  kind: "appointment" | "request";
  status: string;
  starts_at: Date | null;
  ends_at: Date | null;
  duration_min: number | null;
  price_cents: number | null;
  deposit_cents: number;
  deposit_status: string;
  category_name: string;
  service_name: string;
  variant_name: string | null;
  options: { id: string; name: string; price_cents: number | null; duration_min: number }[];
  client_comment: string;
  preferred_schedule: string;
  details: Record<string, unknown> | null;
  admin_note: string;
  source: string;
  cancelled_at: Date | null;
  cancelled_by: string | null;
  cancellation_reason: string;
  late_cancellation: boolean;
  created_at: Date;
  client_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

const SELECT = (sql: ReturnType<typeof db>) => sql`
  select b.id, b.ref, b.kind, b.status, b.starts_at, b.ends_at, b.duration_min, b.price_cents, b.deposit_cents,
         b.deposit_status, b.category_name, b.service_name, b.variant_name, b.options, b.client_comment,
         b.preferred_schedule, b.details, b.admin_note, b.source, b.cancelled_at, b.cancelled_by, b.cancellation_reason,
         b.late_cancellation, b.created_at, b.client_id, c.first_name, c.last_name, c.email, c.phone
  from bookings b left join clients c on c.id = b.client_id`;

export async function bookingsBetween(from: Date, to: Date, includeInactive = false) {
  const sql = db();
  return sql<BookingRow[]>`${SELECT(sql)}
    where b.starts_at >= ${from.toISOString()}::timestamptz and b.starts_at < ${to.toISOString()}::timestamptz
    ${includeInactive ? sql`` : sql`and b.status in ('pending','confirmed','completed','no_show')`}
    order by b.starts_at`;
}

export async function pendingBookings() {
  const sql = db();
  return sql<BookingRow[]>`${SELECT(sql)} where b.status = 'pending' order by coalesce(b.starts_at, b.created_at)`;
}

export async function getBooking(id: string) {
  const sql = db();
  const [row] = await sql<BookingRow[]>`${SELECT(sql)} where b.id = ${id}`;
  return row ?? null;
}

export async function searchBookings(q: string, status: string, limit = 100) {
  const sql = db();
  const like = `%${q.toLowerCase()}%`;
  return sql<BookingRow[]>`${SELECT(sql)}
    where true
    ${q ? sql`and (lower(b.ref) like ${like} or lower(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')) like ${like}
                  or lower(coalesce(c.email,'')) like ${like} or replace(coalesce(c.phone,''), ' ', '') like ${`%${q.replace(/\s/g, "")}%`}
                  or lower(b.service_name) like ${like})` : sql``}
    ${status ? sql`and b.status = ${status}` : sql``}
    order by coalesce(b.starts_at, b.created_at) desc
    limit ${limit}`;
}

export async function emailLogFor(bookingId: string) {
  return db()<{ id: string; kind: string; recipient: string; status: string; error: string | null; created_at: Date }[]>`
    select id, kind, recipient, status, error, created_at from email_log where booking_id = ${bookingId} order by created_at desc`;
}

export type TimeOffRow = { id: string; kind: string; starts_at: Date; ends_at: Date; reason: string };
export async function timeOffBetween(from: Date, to: Date) {
  return db()<TimeOffRow[]>`select id, kind, starts_at, ends_at, reason from time_off
    where tstzrange(starts_at, ends_at) && tstzrange(${from.toISOString()}::timestamptz, ${to.toISOString()}::timestamptz)
    order by starts_at`;
}

export async function bookingsForClient(clientId: string) {
  const sql = db();
  return sql<BookingRow[]>`${SELECT(sql)} where b.client_id = ${clientId}
    order by coalesce(b.starts_at, b.created_at) desc`;
}

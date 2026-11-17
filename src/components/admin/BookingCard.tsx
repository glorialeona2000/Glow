import Link from "next/link";
import type { BookingRow } from "@/lib/admin-data";
import { formatDateShort, formatTime, formatDuration } from "@/lib/time";
import { formatPrice } from "@/lib/money";
import { DEPOSIT_LABEL, StatusBadge } from "./ui";

export function BookingCard({ b, showDate = true }: { b: BookingRow; showDate?: boolean }) {
  const name = b.first_name ? `${b.first_name} ${b.last_name}` : "Cliente supprimée";
  return (
    <Link href={`/admin/reservations/${b.id}`} className="flex gap-4 border-b border-ink/10 py-3.5 last:border-0 hover:bg-cream">
      <div className="w-20 shrink-0 text-sm">
        {b.starts_at ? (
          <>
            {showDate && <p className="text-xs text-mute first-letter:uppercase">{formatDateShort(b.starts_at)}</p>}
            <p className="font-medium">{formatTime(b.starts_at)}</p>
            {b.duration_min && <p className="text-xs text-mute">{formatDuration(b.duration_min)}</p>}
          </>
        ) : (
          <p className="text-xs text-champagne">Formation</p>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{name}</p>
          <StatusBadge status={b.status} />
        </div>
        <p className="mt-0.5 truncate text-sm text-taupe">
          {b.service_name}
          {b.variant_name ? ` — ${b.variant_name}` : ""}
          {b.options.length ? ` + ${b.options.map((o) => o.name).join(", ")}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-mute">
          {b.price_cents != null ? formatPrice(b.price_cents) : ""}
          {b.deposit_status !== "none" ? ` · ${DEPOSIT_LABEL[b.deposit_status]}` : ""}
        </p>
      </div>
    </Link>
  );
}

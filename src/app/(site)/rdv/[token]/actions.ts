"use server";

import { revalidatePath } from "next/cache";
import { bookingErrorMessage, cancelBooking, notifyStatus } from "@/lib/bookings";
import { verifyManageParam } from "@/lib/security";

export async function cancelByClient(token: string, acknowledgedLate: boolean) {
  const id = verifyManageParam(token);
  if (!id) return { ok: false as const, error: "Lien invalide." };
  try {
    const { db } = await import("@/lib/db");
    const { getSettings } = await import("@/lib/data");
    const [[b], settings] = await Promise.all([
      db()<{ status: string; starts_at: Date | null }[]>`select status, starts_at from bookings where id = ${id}`,
      getSettings(),
    ]);
    const late = b?.status === "confirmed" && !!b.starts_at && b.starts_at.getTime() - Date.now() < settings.cancellation_hours * 3600_000;
    if (late && !acknowledgedLate) return { ok: false as const, error: "Merci de confirmer avoir pris connaissance de la perte de l’acompte." };
    const res = await cancelBooking(id, "client");
    const mail = await notifyStatus(id, "cancelled", { by: "client", late: res.late });
    revalidatePath(`/rdv/${token}`);
    return { ok: true as const, emailStatus: mail.client?.status ?? "failed" };
  } catch (e) {
    return { ok: false as const, error: bookingErrorMessage(e) };
  }
}

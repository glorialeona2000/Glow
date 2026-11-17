"use client";
import Link from "next/link";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { acceptBooking } from "../actions";

export function PendingActions({ id, kind }: { id: string; kind: string }) {
  if (kind === "request") {
    return (
      <Link href={`/admin/reservations/${id}`} className="btn btn-outline min-h-10 shrink-0 px-4 md:mr-2">
        Planifier
      </Link>
    );
  }
  return (
    <div className="flex shrink-0 gap-2 pb-3 md:pb-0">
      <ActionForm action={acceptBooking}>
        <input type="hidden" name="id" value={id} />
        <Submit className="btn btn-primary min-h-10 px-4">Accepter</Submit>
      </ActionForm>
      <Link href={`/admin/reservations/${id}#refuser`} className="btn btn-outline min-h-10 px-4">
        Refuser
      </Link>
    </div>
  );
}

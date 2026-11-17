"use client";

import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card, DEPOSIT_LABEL } from "@/components/admin/ui";
import {
  acceptBooking,
  adminCancelBooking,
  declineBooking,
  rescheduleBooking,
  resendConfirmation,
  setBookingStatus,
  updateBookingMeta,
} from "../../../actions";

type B = {
  id: string;
  status: string;
  kind: string;
  isQuote: boolean;
  deposit_status: string;
  admin_note: string;
  date: string;
  time: string;
  duration_min: number;
  price: string;
  hasEmail: boolean;
};

function Hidden({ id }: { id: string }) {
  return <input type="hidden" name="id" value={id} />;
}
function Notify({ show, label = "Prévenir la cliente par e-mail" }: { show: boolean; label?: string }) {
  return show ? (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name="notify" defaultChecked className="accent-ink" /> {label}
    </label>
  ) : null;
}

export function BookingActions({ b }: { b: B }) {
  const active = b.status === "pending" || b.status === "confirmed";

  return (
    <>
      {b.status === "pending" && b.kind === "appointment" && (
        <Card title="Demande à valider">
          <div className="flex flex-col gap-4">
            <ActionForm action={acceptBooking}>
              <Hidden id={b.id} />
              <Submit className="btn btn-primary w-full md:w-auto">Accepter et confirmer</Submit>
              <p className="mt-2 text-xs text-mute">La cliente reçoit l’e-mail de confirmation avec les informations d’acompte et d’annulation.</p>
            </ActionForm>
            <details id="refuser" className="border-t border-ink/10 pt-4">
              <summary className="cursor-pointer text-sm underline">Refuser la demande</summary>
              <ActionForm action={declineBooking} className="mt-4 space-y-3">
                <Hidden id={b.id} />
                <textarea name="reason" className="field min-h-20" placeholder="Message pour la cliente (facultatif)" maxLength={600} />
                <Notify show={b.hasEmail} />
                <Submit className="btn btn-outline">Refuser</Submit>
              </ActionForm>
            </details>
          </div>
        </Card>
      )}

      {b.kind === "request" && b.status === "pending" && (
        <Card title={b.isQuote ? "Demande de devis mariage" : "Demande de formation"}>
          <p className="text-sm text-taupe">
            {b.isQuote
              ? "Envoyez votre devis à la cliente (répondez simplement à l’e-mail de notification). Une fois accepté, planifiez ci-dessous le jour J (et ajoutez l’essai avec « + Rendez-vous »)."
              : "Contactez la cliente pour convenir du planning. Planifiez ci-dessous la première séance (la demande devient un rendez-vous), puis ajoutez les séances suivantes avec « + Rendez-vous »."}
          </p>
          <details id="refuser" className="mt-4 border-t border-ink/10 pt-4">
            <summary className="cursor-pointer text-sm underline">Refuser la demande</summary>
            <ActionForm action={declineBooking} className="mt-4 space-y-3">
              <Hidden id={b.id} />
              <textarea name="reason" className="field min-h-20" placeholder="Message pour la cliente (facultatif)" maxLength={600} />
              <Notify show={b.hasEmail} />
              <Submit className="btn btn-outline">Refuser</Submit>
            </ActionForm>
          </details>
        </Card>
      )}

      {active && (
        <Card title={b.kind === "request" ? (b.isQuote ? "Planifier le rendez-vous" : "Planifier une séance") : "Modifier le rendez-vous"}>
          <ActionForm action={rescheduleBooking} className="space-y-4">
            <Hidden id={b.id} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="col-span-2 md:col-span-1">
                <label className="label">Date</label>
                <input type="date" name="date" defaultValue={b.date} required className="field" />
              </div>
              <div>
                <label className="label">Heure</label>
                <input type="time" name="time" defaultValue={b.time} required step={300} className="field" />
              </div>
              <div>
                <label className="label">Durée (min)</label>
                <input type="number" name="duration_min" defaultValue={b.duration_min} min={5} max={720} required className="field" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="label">Prix (€)</label>
                <input name="price" defaultValue={b.price} inputMode="decimal" className="field" />
              </div>
            </div>
            <Notify show={b.hasEmail} label="Envoyer le nouvel horaire à la cliente" />
            <Submit>Enregistrer</Submit>
            <p className="text-xs text-mute">Les horaires d’ouverture ne s’appliquent pas ici, mais un chevauchement avec un autre rendez-vous reste impossible.</p>
          </ActionForm>
        </Card>
      )}

      <Card title="Suivi">
        <ActionForm action={updateBookingMeta} className="space-y-4">
          <Hidden id={b.id} />
          <div>
            <label className="label">Acompte</label>
            <select name="deposit_status" defaultValue={b.deposit_status} className="field">
              {Object.entries(DEPOSIT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Note interne (privée)</label>
            <textarea name="admin_note" defaultValue={b.admin_note} className="field min-h-24" maxLength={2000} />
          </div>
          <Submit>Enregistrer</Submit>
        </ActionForm>

        {b.status === "confirmed" && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-ink/10 pt-5">
            <ActionForm action={setBookingStatus}>
              <Hidden id={b.id} />
              <input type="hidden" name="status" value="completed" />
              <Submit className="btn btn-outline min-h-10 px-4">Marquer terminé</Submit>
            </ActionForm>
            <ActionForm action={setBookingStatus}>
              <Hidden id={b.id} />
              <input type="hidden" name="status" value="no_show" />
              <Submit className="btn btn-outline min-h-10 px-4">Absente</Submit>
            </ActionForm>
            {b.hasEmail && (
              <ActionForm action={resendConfirmation}>
                <Hidden id={b.id} />
                <Submit className="btn btn-outline min-h-10 px-4">Renvoyer la confirmation</Submit>
              </ActionForm>
            )}
          </div>
        )}
      </Card>

      {active && (
        <Card title="Annuler">
          <ActionForm action={adminCancelBooking} className="space-y-3" confirm="Confirmer l’annulation de ce rendez-vous ?">
            <Hidden id={b.id} />
            <textarea name="reason" className="field min-h-20" placeholder="Motif communiqué à la cliente (facultatif)" maxLength={600} />
            <Notify show={b.hasEmail} />
            <Submit className="btn min-h-11 border border-danger px-5 text-danger hover:bg-danger hover:text-ivory">Annuler le rendez-vous</Submit>
          </ActionForm>
        </Card>
      )}
    </>
  );
}

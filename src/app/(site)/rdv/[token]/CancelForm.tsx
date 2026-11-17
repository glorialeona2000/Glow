"use client";
import { useState, useTransition } from "react";
import { cancelByClient } from "./actions";

export function CancelForm({ token, late, hours, isPending }: { token: string; late: boolean; hours: number; isPending: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [ack, setAck] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (msg) return <p role="status" className="mt-8 border-l-2 border-success bg-success/5 px-4 py-3 text-sm text-success">{msg}</p>;

  return (
    <div className="mt-8">
      {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
      {!confirming ? (
        <button type="button" className="btn btn-outline w-full" onClick={() => setConfirming(true)}>
          {isPending ? "Annuler ma demande" : "Annuler mon rendez-vous"}
        </button>
      ) : (
        <div className="border border-stone bg-white p-5">
          {late && (
            <label className="mb-4 flex items-start gap-3 text-sm leading-relaxed">
              <input type="checkbox" className="mt-1 accent-ink" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>
                Mon rendez-vous a lieu dans moins de {hours} heures : je comprends que <strong className="font-medium">l’acompte est conservé</strong>.
              </span>
            </label>
          )}
          <p className="text-sm">Confirmez-vous l’annulation ?</p>
          <div className="mt-4 flex gap-3">
            <button type="button" className="btn btn-outline flex-1" onClick={() => setConfirming(false)}>
              Retour
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1"
              disabled={pending || (late && !ack)}
              onClick={() =>
                start(async () => {
                  const r = await cancelByClient(token, ack);
                  if (r.ok) {
                    setMsg(
                      r.emailStatus === "sent"
                        ? "Votre annulation est enregistrée. Un e-mail de confirmation vous a été envoyé."
                        : "Votre annulation est enregistrée.",
                    );
                  } else setError(r.error);
                })
              }
            >
              {pending ? "…" : "Confirmer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

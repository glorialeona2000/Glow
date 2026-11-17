"use client";
import { useState } from "react";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card, Empty } from "@/components/admin/ui";
import { addTimeOff, addWeeklyRange, deleteTimeOff, deleteWeeklyRange, saveBookingRules } from "../../actions";

type Range = { id: string; weekday: number; start_time: string; end_time: string; day: string; label?: string };
const DAYS = [
  [1, "Lun"], [2, "Mar"], [3, "Mer"], [4, "Jeu"], [5, "Ven"], [6, "Sam"], [7, "Dim"],
] as const;

function RangeList({ items, table }: { items: Range[]; table: "working_hours" | "breaks" }) {
  if (!items.length) return <Empty>{table === "breaks" ? "Aucune pause." : "Aucun horaire : le calendrier en ligne ne propose aucun créneau."}</Empty>;
  return (
    <ul className="divide-y divide-ink/10">
      {items.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
          <span className="w-24 font-medium">{r.day}</span>
          <span className="flex-1">{r.start_time} – {r.end_time}{r.label && r.label !== "Pause" ? ` · ${r.label}` : ""}</span>
          <ActionForm action={deleteWeeklyRange}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="table" value={table} />
            <button className="text-xs text-danger underline">Retirer</button>
          </ActionForm>
        </li>
      ))}
    </ul>
  );
}

function AddRange({ table }: { table: "working_hours" | "breaks" }) {
  return (
    <ActionForm action={addWeeklyRange} className="mt-5 space-y-3 border-t border-ink/10 pt-5" resetOnSuccess>
      <input type="hidden" name="table" value={table} />
      <div className="flex flex-wrap gap-2">
        {DAYS.map(([v, l]) => (
          <label key={v} className="cursor-pointer">
            <input type="checkbox" name="weekday" value={v} className="peer sr-only" />
            <span className="inline-block border border-stone px-3 py-2 text-xs peer-checked:border-ink peer-checked:bg-ink peer-checked:text-ivory">{l}</span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div><label className="label">De</label><input type="time" name="start_time" required step={300} className="field w-32" defaultValue={table === "breaks" ? "12:30" : "09:30"} /></div>
        <div><label className="label">À</label><input type="time" name="end_time" required step={300} className="field w-32" defaultValue={table === "breaks" ? "13:30" : "18:30"} /></div>
        {table === "breaks" && <div className="flex-1"><label className="label">Libellé</label><input name="label" className="field" placeholder="Pause déjeuner" /></div>}
        <Submit className="btn btn-primary min-h-12 px-5">Ajouter</Submit>
      </div>
    </ActionForm>
  );
}

export function AvailabilityForms({
  hours,
  breaks,
  off,
  rules,
}: {
  hours: Range[];
  breaks: Range[];
  off: { id: string; kind: string; reason: string; label: string }[];
  rules: { slot_interval_min: number; buffer_min: number; min_notice_hours: number; max_days_ahead: number };
}) {
  const [kind, setKind] = useState<"block" | "vacation">("block");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Horaires de travail">
        <p className="mb-4 text-sm text-taupe">Plusieurs plages par jour possibles (ex. 9h–12h et 14h–19h). Jour sans plage = fermé.</p>
        <RangeList items={hours} table="working_hours" />
        <AddRange table="working_hours" />
      </Card>
      <Card title="Pauses récurrentes">
        <RangeList items={breaks} table="breaks" />
        <AddRange table="breaks" />
      </Card>
      <Card title="Congés et créneaux bloqués" className="scroll-mt-28">
        <div id="bloquer" className="scroll-mt-28" />
        {off.length ? (
          <ul className="mb-5 divide-y divide-ink/10">
            {off.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="w-20 text-xs tracking-[0.12em] uppercase text-mute">{o.kind === "vacation" ? "Congés" : "Bloqué"}</span>
                <span className="flex-1 first-letter:uppercase">{o.label}{o.reason ? ` · ${o.reason}` : ""}</span>
                <ActionForm action={deleteTimeOff}>
                  <input type="hidden" name="id" value={o.id} />
                  <button className="text-xs text-danger underline">Retirer</button>
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Aucun congé à venir.</Empty>
        )}
        <ActionForm action={addTimeOff} className="space-y-3 border-t border-ink/10 pt-5" resetOnSuccess>
          <div className="flex border border-ink/15">
            {(["block", "vacation"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={`flex-1 py-2 text-xs tracking-[0.12em] uppercase ${kind === k ? "bg-ink text-ivory" : ""}`}>
                {k === "block" ? "Bloquer un créneau" : "Congés / absence"}
              </button>
            ))}
          </div>
          <input type="hidden" name="kind" value={kind} />
          {kind === "block" ? (
            <div className="flex flex-wrap items-end gap-3">
              <div><label className="label">Date</label><input type="date" name="start_date" required className="field" /></div>
              <div><label className="label">De</label><input type="time" name="start_time" required step={300} className="field w-32" /></div>
              <div><label className="label">À</label><input type="time" name="end_time" required step={300} className="field w-32" /></div>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div><label className="label">Du</label><input type="date" name="start_date" required className="field" /></div>
              <div><label className="label">Au (inclus)</label><input type="date" name="end_date" required className="field" /></div>
            </div>
          )}
          <input name="reason" placeholder="Motif (privé, facultatif)" className="field" maxLength={200} />
          <Submit>Enregistrer</Submit>
        </ActionForm>
      </Card>
      <Card title="Règles de réservation">
        <ActionForm action={saveBookingRules} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Intervalle des créneaux (min)</label>
              <select name="slot_interval_min" defaultValue={rules.slot_interval_min} className="field">
                {[10, 15, 20, 30, 45, 60].map((v) => <option key={v} value={v}>{v} min</option>)}
              </select>
            </div>
            <div><label className="label">Temps tampon (min)</label><input type="number" name="buffer_min" defaultValue={rules.buffer_min} min={0} max={240} className="field" /></div>
            <div><label className="label">Délai minimum (heures)</label><input type="number" name="min_notice_hours" defaultValue={rules.min_notice_hours} min={0} max={720} className="field" /></div>
            <div><label className="label">Réservable jusqu’à (jours)</label><input type="number" name="max_days_ahead" defaultValue={rules.max_days_ahead} min={1} max={365} className="field" /></div>
          </div>
          <p className="text-xs text-mute">
            Temps tampon : temps libre gardé après chaque rendez-vous (rangement, désinfection). Délai minimum : une cliente ne peut pas réserver moins de X heures à l’avance.
          </p>
          <Submit>Enregistrer</Submit>
        </ActionForm>
      </Card>
    </div>
  );
}

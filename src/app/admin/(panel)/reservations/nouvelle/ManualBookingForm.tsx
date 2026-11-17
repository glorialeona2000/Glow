"use client";
import { useState } from "react";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card } from "@/components/admin/ui";
import { createManualBooking } from "../../../actions";
import { centsToInput } from "@/lib/money";

type Svc = {
  id: string;
  label: string;
  duration: number | null;
  price: number | null;
  variants: { id: string; name: string; duration: number | null; price: number | null }[];
  options: { id: string; name: string; duration: number; price: number | null }[];
};

export function ManualBookingForm({
  services,
  client,
  date,
}: {
  services: Svc[];
  client: { first_name: string; last_name: string; email: string; phone: string } | null;
  date: string;
}) {
  const [sid, setSid] = useState(services[0]?.id ?? "");
  const [vid, setVid] = useState("");
  const [opts, setOpts] = useState<string[]>([]);
  const svc = services.find((s) => s.id === sid);
  const variant = svc?.variants.find((v) => v.id === vid);
  const chosen = svc?.options.filter((o) => opts.includes(o.id)) ?? [];
  const baseDur = variant ? variant.duration : svc?.duration;
  const basePrice = variant ? variant.price : svc?.price;
  const dur = (baseDur ?? 60) + chosen.reduce((a, o) => a + o.duration, 0);
  const price = basePrice != null ? basePrice + chosen.reduce((a, o) => a + (o.price ?? 0), 0) : null;

  return (
    <ActionForm action={createManualBooking} className="grid gap-6 lg:grid-cols-2">
      <Card title="Prestation">
        <div className="space-y-4">
          <div>
            <label className="label">Prestation</label>
            <select
              name="service_id"
              className="field"
              value={sid}
              onChange={(e) => {
                setSid(e.target.value);
                setVid("");
                setOpts([]);
              }}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {!!svc?.variants.length && (
            <div>
              <label className="label">Formule</label>
              <select name="variant_id" className="field" value={vid} onChange={(e) => setVid(e.target.value)} required>
                <option value="">Choisir…</option>
                {svc.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!!svc?.options.length && (
            <fieldset>
              <legend className="label">Options</legend>
              {svc.options.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="option_ids"
                    value={o.id}
                    className="accent-ink"
                    checked={opts.includes(o.id)}
                    onChange={(e) => setOpts((x) => (e.target.checked ? [...x, o.id] : x.filter((y) => y !== o.id)))}
                  />
                  {o.name}
                </label>
              ))}
            </fieldset>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Date</label>
              <input type="date" name="date" defaultValue={date} required className="field" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Heure</label>
              <input type="time" name="time" required step={300} className="field" />
            </div>
            <div>
              <label className="label">Durée (min)</label>
              <input key={`d${sid}${vid}${opts.join()}`} type="number" name="duration_min" defaultValue={dur} min={5} max={720} required className="field" />
            </div>
            <div>
              <label className="label">Prix (€)</label>
              <input key={`p${sid}${vid}${opts.join()}`} name="price" defaultValue={centsToInput(price)} inputMode="decimal" className="field" />
            </div>
          </div>
        </div>
      </Card>
      <Card title="Cliente">
        <div className="space-y-4">
          <p className="text-xs text-mute">Si l’e-mail correspond à une cliente existante, sa fiche est mise à jour.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Prénom</label>
              <input name="first_name" defaultValue={client?.first_name} required className="field" />
            </div>
            <div>
              <label className="label">Nom</label>
              <input name="last_name" defaultValue={client?.last_name} required className="field" />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input name="phone" type="tel" defaultValue={client?.phone} required className="field" />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input name="email" type="email" defaultValue={client?.email} required className="field" />
            </div>
          </div>
          <div>
            <label className="label">Commentaire</label>
            <textarea name="comment" className="field min-h-20" maxLength={800} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notify" defaultChecked className="accent-ink" /> Envoyer la confirmation par e-mail
          </label>
          <Submit className="btn btn-primary w-full">Créer le rendez-vous</Submit>
        </div>
      </Card>
    </ActionForm>
  );
}

"use client";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card } from "@/components/admin/ui";
import { archiveService, archiveVariant, saveService, saveVariant } from "../../../actions";
import { centsToInput } from "@/lib/money";

type Service = { id: string; category_id: string; name: string; description: string; highlights: string[]; note: string; price_cents: number | null; duration_min: number | null; booking_mode: string; requires_deposit: boolean; sort: number; visible: boolean };
type Variant = { id: string; name: string; description: string; price_cents: number | null; duration_min: number | null; sort: number; visible: boolean };

export function ServiceEditor({
  service: s,
  categories,
  variants,
  options,
  linked,
}: {
  service: Service;
  categories: { id: string; name: string }[];
  variants: Variant[];
  options: { id: string; name: string }[];
  linked: string[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card title="Fiche">
        <ActionForm action={saveService} className="space-y-4">
          <input type="hidden" name="id" value={s.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Nom</label><input name="name" defaultValue={s.name} required className="field" maxLength={120} /></div>
            <div>
              <label className="label">Catégorie</label>
              <select name="category_id" defaultValue={s.category_id} className="field">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Description</label><textarea name="description" defaultValue={s.description} className="field min-h-28" maxLength={2000} /></div>
          <div>
            <label className="label">Points clés (un par ligne, facultatif)</label>
            <textarea name="highlights" defaultValue={s.highlights.join("\n")} className="field min-h-24" placeholder="Ex. : Anti-âge : prévention…" />
          </div>
          <div><label className="label">Note mise en avant (facultatif)</label><textarea name="note" defaultValue={s.note} className="field min-h-16" maxLength={1000} /></div>
          <div>
            <label className="label">Mode de réservation</label>
            <select name="booking_mode" defaultValue={s.booking_mode} className="field">
              <option value="appointment">Créneau réservable en ligne</option>
              <option value="request">Sur demande (planification personnalisée, ex. formations)</option>
              <option value="quote">Demande de devis mariage (date, lieu, essai, retouches)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div><label className="label">Prix (€)</label><input name="price" defaultValue={centsToInput(s.price_cents)} inputMode="decimal" className="field" placeholder="à définir" /></div>
            <div><label className="label">Durée (min)</label><input type="number" name="duration_min" defaultValue={s.duration_min ?? ""} min={5} max={720} className="field" placeholder="à définir" /></div>
            <div><label className="label">Ordre</label><input type="number" name="sort" defaultValue={s.sort} className="field" /></div>
          </div>
          {variants.length > 0 && <p className="text-xs text-mute">Cette prestation a des formules : ce sont leurs prix et durées qui s’appliquent.</p>}
          {options.length > 0 && (
            <fieldset>
              <legend className="label">Options compatibles</legend>
              <div className="flex flex-wrap gap-4">
                {options.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="option_ids" value={o.id} defaultChecked={linked.includes(o.id)} className="accent-ink" /> {o.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requires_deposit" defaultChecked={s.requires_deposit} className="accent-ink" /> Acompte demandé (montant défini dans Paramètres)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={s.visible} className="accent-ink" /> Visible sur le site</label>
          <Submit>Enregistrer</Submit>
        </ActionForm>
      </Card>
      <div className="space-y-6">
        <Card title="Formules">
          <p className="mb-4 text-sm text-taupe">Facultatif : variantes avec leur propre prix et durée (ex. « Renforcement » / « Extension »). La cliente choisit sa formule.</p>
          <div className="space-y-4">
            {variants.map((v) => (
              <div key={v.id} className="border border-ink/10 p-4">
                <ActionForm action={saveVariant} className="space-y-3">
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="service_id" value={s.id} />
                  <div><label className="label">Nom</label><input name="name" defaultValue={v.name} required className="field" /></div>
                  <div><label className="label">Description</label><input name="description" defaultValue={v.description} className="field" /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="label">Prix (€)</label><input name="price" defaultValue={centsToInput(v.price_cents)} inputMode="decimal" className="field" /></div>
                    <div><label className="label">Durée</label><input type="number" name="duration_min" defaultValue={v.duration_min ?? ""} min={5} max={720} className="field" /></div>
                    <div><label className="label">Ordre</label><input type="number" name="sort" defaultValue={v.sort} className="field" /></div>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={v.visible} className="accent-ink" /> Visible</label>
                  <Submit className="btn btn-primary min-h-10 px-4">Enregistrer</Submit>
                </ActionForm>
                <ActionForm action={archiveVariant} className="mt-2" confirm="Supprimer cette formule ?">
                  <input type="hidden" name="id" value={v.id} />
                  <button className="text-xs text-danger underline">Supprimer</button>
                </ActionForm>
              </div>
            ))}
            <ActionForm action={saveVariant} className="space-y-2 border-t border-ink/10 pt-4" resetOnSuccess>
              <input type="hidden" name="service_id" value={s.id} />
              <input name="name" placeholder="Nouvelle formule…" required className="field" />
              <Submit className="btn btn-outline min-h-10 px-4">+ Ajouter une formule</Submit>
            </ActionForm>
          </div>
        </Card>
        <Card title="Supprimer" className="border-danger/20">
          <p className="text-sm text-taupe">La prestation disparaît du site et de l’admin. Les réservations passées restent dans l’historique.</p>
          <ActionForm action={archiveService} className="mt-4" confirm="Supprimer cette prestation ?">
            <input type="hidden" name="id" value={s.id} />
            <Submit className="btn min-h-11 border border-danger px-5 text-danger hover:bg-danger hover:text-ivory">Supprimer la prestation</Submit>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}

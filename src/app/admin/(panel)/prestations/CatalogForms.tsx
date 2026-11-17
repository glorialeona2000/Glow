"use client";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { ImageField } from "@/components/admin/ImageField";
import { archiveOption, createService, saveCategory, saveOption } from "../../actions";
import { centsToInput } from "@/lib/money";

export function NewServiceForm({ categoryId }: { categoryId: string }) {
  return (
    <ActionForm action={createService} className="mt-4 flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="category_id" value={categoryId} />
      <input name="name" placeholder="Nouvelle prestation…" required className="field flex-1" maxLength={120} />
      <Submit className="btn btn-outline min-h-12 px-5">+ Ajouter</Submit>
    </ActionForm>
  );
}

export function CategoryForm({ c }: { c: { id: string; name: string; tagline: string; description: string; image_url: string | null; sort: number; visible: boolean } }) {
  return (
    <ActionForm action={saveCategory} className="mt-4 space-y-4">
      <input type="hidden" name="id" value={c.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Nom</label><input name="name" defaultValue={c.name} required className="field" /></div>
        <div><label className="label">Sous-titre</label><input name="tagline" defaultValue={c.tagline} className="field" /></div>
      </div>
      <div><label className="label">Description</label><textarea name="description" defaultValue={c.description} className="field min-h-20" /></div>
      <ImageField name="image_url" defaultValue={c.image_url} />
      <div className="flex items-center gap-6">
        <div className="w-28"><label className="label">Ordre</label><input type="number" name="sort" defaultValue={c.sort} className="field" /></div>
        <label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={c.visible} className="accent-ink" /> Visible sur le site</label>
      </div>
      <Submit>Enregistrer la catégorie</Submit>
    </ActionForm>
  );
}

type Opt = { id: string; name: string; description: string; price_cents: number | null; duration_min: number; active: boolean; sort: number };

export function OptionForms({ options }: { options: Opt[] }) {
  return (
    <div className="space-y-4">
      {options.map((o) => (
        <div key={o.id} className="border border-ink/10 p-4">
          <ActionForm action={saveOption} className="space-y-3">
            <input type="hidden" name="id" value={o.id} />
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <div><label className="label">Nom</label><input name="name" defaultValue={o.name} required className="field" /></div>
              <div><label className="label">Supplément (€)</label><input name="price" defaultValue={centsToInput(o.price_cents)} inputMode="decimal" className="field" placeholder="à définir" /></div>
              <div><label className="label">+ Durée (min)</label><input type="number" name="duration_min" defaultValue={o.duration_min} min={0} max={240} className="field" /></div>
            </div>
            <div><label className="label">Description</label><input name="description" defaultValue={o.description} className="field" /></div>
            <input type="hidden" name="sort" value={o.sort} />
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={o.active} className="accent-ink" /> Activée</label>
              {o.price_cents == null && <span className="text-xs text-warning">Sans supplément défini, l’option n’est pas proposée aux clientes.</span>}
              <Submit className="btn btn-primary min-h-10 px-4">Enregistrer</Submit>
            </div>
          </ActionForm>
          <ActionForm action={archiveOption} className="mt-2" confirm={`Supprimer l’option « ${o.name} » ?`}>
            <input type="hidden" name="id" value={o.id} />
            <button className="text-xs text-danger underline">Supprimer l’option</button>
          </ActionForm>
        </div>
      ))}
      <ActionForm action={saveOption} className="flex flex-col gap-2 border-t border-ink/10 pt-4 sm:flex-row" resetOnSuccess>
        <input name="name" placeholder="Nouvelle option…" required className="field flex-1" />
        <Submit className="btn btn-outline min-h-12 px-5">+ Ajouter</Submit>
      </ActionForm>
    </div>
  );
}

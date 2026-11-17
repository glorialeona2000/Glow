"use client";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { ImageField } from "@/components/admin/ImageField";
import { Card } from "@/components/admin/ui";
import type { ContentField } from "@/lib/content";
import type { GalleryItem } from "@/lib/data";
import { addGalleryItem, saveContent, saveGalleryItem } from "../../actions";

export function ContentForm({ group, fields, values }: { group: string; fields: ContentField[]; values: Record<string, string> }) {
  return (
    <Card title={group}>
      <ActionForm action={saveContent} className="space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            {f.type === "image" ? (
              <ImageField name={f.key} defaultValue={values[f.key]} label={f.label} />
            ) : (
              <>
                <label className="label" htmlFor={f.key}>{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea id={f.key} name={f.key} defaultValue={values[f.key]} className="field min-h-28" />
                ) : (
                  <input id={f.key} name={f.key} defaultValue={values[f.key]} className="field" />
                )}
              </>
            )}
            {f.help && <p className="mt-1 text-xs text-mute">{f.help}</p>}
            {(f.key === "deposit_text" || f.key === "cancellation_text") && (
              <p className="mt-1 text-xs text-mute">{"{acompte}"} et {"{delai}"} sont remplacés automatiquement par le montant et le délai définis dans Paramètres.</p>
            )}
          </div>
        ))}
        <Submit>Enregistrer</Submit>
      </ActionForm>
    </Card>
  );
}

export function GalleryManager({ items }: { items: GalleryItem[] }) {
  return (
    <Card title="Galerie de réalisations">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((g) => (
          <ActionForm key={g.id} action={saveGalleryItem} className="border border-ink/10 p-3">
            <input type="hidden" name="id" value={g.id} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.image_url} alt="" className={`aspect-[4/5] w-full object-cover ${g.visible ? "" : "opacity-40"}`} />
            <div className="mt-3 space-y-2">
              <input name="alt" defaultValue={g.alt} placeholder="Description (accessibilité, SEO)" className="field text-sm" />
              <div className="flex gap-2">
                <input name="category" defaultValue={g.category ?? ""} placeholder="Catégorie" className="field text-sm" />
                <input name="sort" type="number" defaultValue={g.sort} className="field w-20 text-sm" aria-label="Ordre" />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={g.visible} className="accent-ink" /> Visible</label>
              <div className="flex items-center justify-between">
                <Submit className="btn btn-primary min-h-10 px-4">OK</Submit>
                <button name="_delete" value="1" className="text-xs text-danger underline" onClick={(e) => { if (!confirm("Retirer cette photo ?")) e.preventDefault(); }}>
                  Retirer
                </button>
              </div>
            </div>
          </ActionForm>
        ))}
      </div>
      <ActionForm action={addGalleryItem} className="mt-6 space-y-3 border-t border-ink/10 pt-5" resetOnSuccess>
        <p className="display text-lg">Ajouter une photo</p>
        <ImageField name="image_url" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="alt" placeholder="Description (ex. Maquillage mariée)" className="field" />
          <input name="category" placeholder="Catégorie (ex. Make-up)" className="field" />
        </div>
        <Submit>Ajouter à la galerie</Submit>
      </ActionForm>
    </Card>
  );
}

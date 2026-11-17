"use client";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card } from "@/components/admin/ui";
import { eraseClient, updateClient } from "../../../actions";

export function ClientForms({ c }: { c: { id: string; first_name: string; last_name: string; email: string; phone: string; notes: string } }) {
  return (
    <div className="space-y-6">
      <Card title="Coordonnées">
        <ActionForm action={updateClient} className="space-y-4">
          <input type="hidden" name="id" value={c.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Prénom</label><input name="first_name" defaultValue={c.first_name} required className="field" /></div>
            <div><label className="label">Nom</label><input name="last_name" defaultValue={c.last_name} required className="field" /></div>
            <div><label className="label">Téléphone</label><input name="phone" defaultValue={c.phone} className="field" /></div>
            <div><label className="label">E-mail</label><input name="email" type="email" defaultValue={c.email} required className="field" /></div>
          </div>
          <div>
            <label className="label">Notes internes (strictement privées)</label>
            <textarea name="notes" defaultValue={c.notes} className="field min-h-32" maxLength={5000} placeholder="Préférences, teinte de fond de teint, forme d’ongles préférée…" />
            <p className="mt-1 text-xs text-mute">RGPD : n’indiquez que des informations utiles à la prestation. Évitez les données de santé sauf nécessité (ex. allergie) et avec l’accord de la cliente.</p>
          </div>
          <Submit>Enregistrer</Submit>
        </ActionForm>
      </Card>
      <Card title="Supprimer les données" className="border-danger/20">
        <p className="text-sm text-taupe">
          Droit à l’effacement (RGPD) : la fiche est supprimée, les rendez-vous à venir annulés et l’historique anonymisé. Action irréversible.
        </p>
        <ActionForm action={eraseClient} className="mt-4 flex flex-col gap-3 sm:flex-row" confirm="Supprimer définitivement les données de cette cliente ?">
          <input type="hidden" name="id" value={c.id} />
          <input name="confirm" placeholder="Tapez SUPPRIMER" className="field sm:w-48" autoComplete="off" />
          <Submit className="btn min-h-12 border border-danger px-5 text-danger hover:bg-danger hover:text-ivory">Supprimer</Submit>
        </ActionForm>
      </Card>
    </div>
  );
}

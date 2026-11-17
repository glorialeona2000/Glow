"use client";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card } from "@/components/admin/ui";
import { saveSettings, sendTestEmail } from "../../actions";

type S = {
  notification_email: string;
  deposit_enabled: boolean;
  deposit: string;
  cancellation_hours: number;
  reminders_enabled: boolean;
  reminder_hours_before: number;
  retention_months: number;
  max_requests_per_hour: number;
};

export function SettingsForm({ s }: { s: S }) {
  return (
    <Card title="Réservations et notifications">
      <ActionForm action={saveSettings} className="space-y-6">
        <div>
          <label className="label">E-mail qui reçoit les nouvelles demandes</label>
          <input name="notification_email" type="email" defaultValue={s.notification_email} required className="field" />
        </div>
        <fieldset className="space-y-3 border-t border-ink/10 pt-5">
          <legend className="display mb-2 text-lg">Acompte et annulation</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="deposit_enabled" defaultChecked={s.deposit_enabled} className="accent-ink" /> Demander un acompte</label>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Montant (€)</label><input name="deposit" defaultValue={s.deposit} inputMode="decimal" className="field" /></div>
            <div><label className="label">Annulation gratuite jusqu’à (h)</label><input type="number" name="cancellation_hours" defaultValue={s.cancellation_hours} min={0} max={720} className="field" /></div>
          </div>
          <p className="text-xs text-mute">L’acompte est suivi manuellement (reçu / conservé / remboursé) dans chaque réservation. Le paiement en ligne pourra être ajouté plus tard.</p>
        </fieldset>
        <fieldset className="space-y-3 border-t border-ink/10 pt-5">
          <legend className="display mb-2 text-lg">Rappels automatiques</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="reminders_enabled" defaultChecked={s.reminders_enabled} className="accent-ink" /> Envoyer un rappel par e-mail</label>
          <div className="w-48"><label className="label">Heures avant le rdv</label><input type="number" name="reminder_hours_before" defaultValue={s.reminder_hours_before} min={1} max={168} className="field" /></div>
        </fieldset>
        <fieldset className="space-y-3 border-t border-ink/10 pt-5">
          <legend className="display mb-2 text-lg">Confidentialité et sécurité</legend>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Conservation (mois)</label><input type="number" name="retention_months" defaultValue={s.retention_months} min={6} max={120} className="field" /></div>
            <div><label className="label">Demandes max / heure / connexion</label><input type="number" name="max_requests_per_hour" defaultValue={s.max_requests_per_hour} min={1} max={100} className="field" /></div>
          </div>
          <p className="text-xs text-mute">Les fiches clientes sans rendez-vous depuis cette durée sont supprimées automatiquement (RGPD).</p>
        </fieldset>
        <Submit>Enregistrer</Submit>
      </ActionForm>
    </Card>
  );
}

export function TestEmail() {
  return (
    <ActionForm action={sendTestEmail} className="mt-5 border-t border-ink/10 pt-4">
      <Submit className="btn btn-outline min-h-10 px-4">Envoyer un e-mail de test</Submit>
    </ActionForm>
  );
}

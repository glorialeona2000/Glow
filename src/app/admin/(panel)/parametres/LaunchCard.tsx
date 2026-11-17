"use client";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card } from "@/components/admin/ui";
import { setComingSoon } from "../../actions";

export function LaunchCard({ soon, previewUrl }: { soon: boolean; previewUrl: string }) {
  return (
    <Card title="Mise en ligne" className={soon ? "border-champagne/50" : "border-success/30"}>
      {soon ? (
        <>
          <p className="text-sm leading-relaxed text-taupe">
            Le site est en mode <strong className="font-medium text-ink">« Bientôt disponible »</strong> : les visiteurs voient la page
            d’attente et ne peuvent pas réserver.
          </p>
          <a href={previewUrl} target="_blank" className="btn btn-outline mt-4 min-h-11 w-full px-5">
            Voir le site en aperçu
          </a>
          <p className="mt-2 text-xs text-mute">L’aperçu reste actif sur cet appareil. Ne partagez pas ce lien.</p>
          <ActionForm action={setComingSoon} className="mt-6 border-t border-ink/10 pt-5" confirm="Publier le site ? Tout le monde pourra le voir et réserver.">
            <input type="hidden" name="on" value="0" />
            <Submit className="btn btn-primary w-full">Publier le site</Submit>
          </ActionForm>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-taupe">
            <strong className="font-medium text-success">Le site est en ligne.</strong> Tout le monde peut le consulter et réserver.
          </p>
          <ActionForm action={setComingSoon} className="mt-5" confirm="Réactiver la page d’attente ? Les réservations en ligne seront suspendues.">
            <input type="hidden" name="on" value="1" />
            <Submit className="btn btn-outline min-h-11 w-full px-5">Réactiver « Bientôt disponible »</Submit>
          </ActionForm>
        </>
      )}
    </Card>
  );
}

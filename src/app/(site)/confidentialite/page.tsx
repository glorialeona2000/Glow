import type { Metadata } from "next";
import { getContent, getSettings } from "@/lib/data";
import { PageHero } from "@/components/PageHero";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default async function PrivacyPage() {
  const [c, s] = await Promise.all([getContent(), getSettings()]);
  const email = c.legal_contact_email;
  return (
    <>
      <PageHero eyebrow="RGPD" title="Confidentialité" />
      <Prose>
        <p>
          La présente politique explique comment <strong>{c.legal_name}</strong> (BELAVICA Beauty Studio, {c.city}) traite vos données
          personnelles lorsque vous utilisez le site belavica.com, conformément au Règlement général sur la protection des données
          (RGPD — Règlement (UE) 2016/679) et à la loi belge du 30 juillet 2018.
        </p>

        <h2>Responsable du traitement</h2>
        <p>
          {c.legal_name}
          {c.legal_company_number ? ` — n° d’entreprise ${c.legal_company_number}` : ""}, {c.city}.<br />
          Contact pour toute question relative à vos données : <a href={`mailto:${email}`}>{email}</a>.
        </p>

        <h2>Données collectées</h2>
        <p>Lors d’une réservation, nous collectons uniquement les données nécessaires :</p>
        <ul>
          <li>prénom et nom ;</li>
          <li>numéro de téléphone et adresse e-mail ;</li>
          <li>la prestation choisie, la date et l’heure du rendez-vous ;</li>
          <li>votre commentaire éventuel (facultatif) ;</li>
          <li>une empreinte technique non réversible de votre adresse IP, utilisée uniquement pour limiter les réservations abusives.</li>
        </ul>
        <p>Nous ne vous demandons pas de créer de compte et ne collectons aucune donnée de santé via le site. Merci de ne pas en indiquer dans le champ commentaire : les informations utiles à votre soin seront abordées de vive voix.</p>

        <h2>Finalités et bases légales</h2>
        <ul>
          <li><strong>Gestion de vos rendez-vous</strong> (réservation, confirmation, rappel, annulation) : exécution de mesures précontractuelles et du contrat (art. 6.1.b RGPD).</li>
          <li><strong>Suivi de la relation cliente</strong> (historique des rendez-vous, préférences utiles à la prestation) : intérêt légitime à vous offrir un service personnalisé (art. 6.1.f).</li>
          <li><strong>Sécurité du site et prévention des abus</strong> : intérêt légitime (art. 6.1.f).</li>
          <li><strong>Obligations comptables et légales</strong>, le cas échéant : obligation légale (art. 6.1.c).</li>
        </ul>
        <p>Vos données ne sont jamais vendues, ni utilisées à des fins publicitaires.</p>

        <h2>Destinataires et sous-traitants</h2>
        <p>Vos données sont accessibles uniquement à BELAVICA. Elles sont hébergées et traitées par des prestataires techniques liés par des engagements de confidentialité et de sécurité :</p>
        <ul>
          <li><strong>Supabase</strong> — base de données, hébergée dans l’Union européenne ;</li>
          <li><strong>Netlify</strong> — hébergement du site ;</li>
          <li><strong>Resend</strong> — envoi des e-mails de réservation ;</li>
          <li><strong>Cloudflare Turnstile</strong> — protection anti-robot du formulaire de réservation.</li>
        </ul>
        <p>
          Certains de ces prestataires peuvent traiter des données en dehors de l’Union européenne (notamment aux États-Unis). Ces transferts
          sont encadrés par les clauses contractuelles types de la Commission européenne et/ou le cadre de protection des données UE–États-Unis.
        </p>

        <h2>Durée de conservation</h2>
        <p>
          Vos données sont conservées pendant la durée de la relation, puis supprimées ou anonymisées automatiquement {s.retention_months} mois
          après votre dernier rendez-vous. Les e-mails techniques d’envoi sont conservés au maximum 12 mois. Les pièces comptables éventuelles
          sont conservées pendant la durée imposée par la loi.
        </p>

        <h2>Cookies</h2>
        <p>
          Le site n’utilise ni cookie publicitaire ni outil de mesure d’audience. Seuls des cookies strictement nécessaires sont utilisés pour la
          connexion à l’espace administrateur. La vérification anti-robot (Cloudflare Turnstile) peut traiter des informations techniques sur votre
          navigateur, uniquement à des fins de sécurité.
        </p>

        <h2>Vos droits</h2>
        <p>
          Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité de vos données. Pour les
          exercer, écrivez à <a href={`mailto:${email}`}>{email}</a> ; nous répondons dans un délai d’un mois.
        </p>
        <p>
          Vous pouvez également introduire une réclamation auprès de l’Autorité de protection des données (Belgique —{" "}
          <a href="https://www.autoriteprotectiondonnees.be" target="_blank" rel="noopener noreferrer">autoriteprotectiondonnees.be</a>) ou, si vous
          résidez au Luxembourg, de la CNPD (<a href="https://cnpd.public.lu" target="_blank" rel="noopener noreferrer">cnpd.public.lu</a>).
        </p>

        <h2>Sécurité</h2>
        <p>
          Le site est servi exclusivement en HTTPS. L’accès aux données est réservé à l’administratrice, protégé par une authentification
          sécurisée, et la base de données n’est jamais accessible publiquement. Des sauvegardes chiffrées sont réalisées régulièrement.
        </p>

        <p className="mt-10 text-xs">Dernière mise à jour : novembre 2026.</p>
      </Prose>
    </>
  );
}

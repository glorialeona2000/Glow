import type { Metadata } from "next";
import { getContent } from "@/lib/data";
import { PageHero } from "@/components/PageHero";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Mentions légales" };

export default async function LegalPage() {
  const c = await getContent();
  return (
    <>
      <PageHero eyebrow="Informations" title="Mentions légales" />
      <Prose>
        <h2>Éditeur du site</h2>
        <p>
          <strong>{c.legal_name}</strong> — BELAVICA Beauty Studio<br />
          {c.city}
          {c.legal_company_number && (
            <>
              <br />Numéro d’entreprise (BCE) : {c.legal_company_number}
            </>
          )}
          {c.legal_vat && (
            <>
              <br />TVA : {c.legal_vat}
            </>
          )}
          <br />
          Contact : <a href={`https://instagram.com/${c.instagram_handle}`}>@{c.instagram_handle}</a> · <a href={`mailto:${c.legal_contact_email}`}>{c.legal_contact_email}</a>
        </p>
        <h2>Hébergement</h2>
        <p>
          Site hébergé par Netlify, Inc., 101 2nd Street, San Francisco, CA 94105, États-Unis. Base de données hébergée par Supabase, Inc., dans
          l’Union européenne.
        </p>
        <h2>Propriété intellectuelle</h2>
        <p>
          Le logo, les textes et les photographies présents sur ce site sont la propriété de BELAVICA ou utilisés avec l’autorisation des
          personnes concernées. Toute reproduction sans autorisation est interdite.
        </p>
        <h2>Conditions de réservation</h2>
        <p>
          Les demandes de rendez-vous effectuées en ligne sont confirmées après validation. Un acompte peut être demandé pour confirmer le
          rendez-vous. Les conditions d’annulation sont rappelées lors de la réservation et dans l’e-mail de confirmation.
        </p>
      </Prose>
    </>
  );
}

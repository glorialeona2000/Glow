// Textes et informations modifiables depuis l'admin (Admin > Site).
// Les valeurs par défaut ci-dessous s'affichent tant qu'elles ne sont pas modifiées.

export type ContentField = {
  key: string;
  label: string;
  group: string;
  type: "text" | "textarea" | "url" | "image";
  default: string;
  help?: string;
};

export const CONTENT_FIELDS: ContentField[] = [
  // Accueil
  { key: "hero_eyebrow", group: "Accueil", label: "Sur-titre", type: "text", default: "Beauty Studio · Arlon" },
  { key: "hero_title", group: "Accueil", label: "Titre principal", type: "text", default: "L’art de révéler votre beauté" },
  { key: "hero_text", group: "Accueil", label: "Présentation courte", type: "textarea",
    default: "Maquillage, regard, ongles et soins du visage : chaque rendez-vous est une parenthèse sur mesure, pensée pour sublimer votre beauté naturelle avec précision et élégance." },
  { key: "intro_quote", group: "Accueil", label: "Phrase signature", type: "textarea",
    default: "Une beauté discrète, précise et lumineuse — dans un studio intimiste, où chaque détail compte." },
  // À propos
  { key: "about_name", group: "À propos", label: "Prénom affiché", type: "text", default: "Gloria Leona" },
  { key: "about_role", group: "À propos", label: "Rôle", type: "text", default: "Fondatrice & make-up artist" },
  { key: "about_text", group: "À propos", label: "Texte de présentation", type: "textarea",
    default: "Passionnée par la beauté sous toutes ses formes, j’ai créé BELAVICA comme un écrin où l’exigence rencontre la douceur. Mon approche : écouter, observer, puis sublimer — sans jamais masquer qui vous êtes.\n\nDu maquillage de mariée aux soins du visage personnalisés, je vous accueille à Arlon pour un moment rien qu’à vous." },
  { key: "about_image", group: "À propos", label: "Photo", type: "image", default: "/images/gloria.webp" },
  // Contact & pratique
  { key: "instagram_handle", group: "Contact", label: "Compte Instagram", type: "text", default: "bybelavica", help: "Sans le @" },
  { key: "city", group: "Contact", label: "Ville", type: "text", default: "Arlon, Belgique" },
  { key: "address_notice", group: "Contact", label: "Mention sur l’adresse", type: "textarea",
    default: "L’adresse exacte du studio vous est communiquée par message privé après la confirmation de votre rendez-vous." },
  { key: "contact_text", group: "Contact", label: "Texte de la page contact", type: "textarea",
    default: "Pour toute question, une demande particulière ou une prestation sur mesure, écrivez-moi sur Instagram : je vous réponds avec plaisir." },
  { key: "hours_notice", group: "Contact", label: "Mention horaires", type: "text", default: "Uniquement sur rendez-vous" },
  // Réservation
  { key: "deposit_text", group: "Réservation", label: "Explication de l’acompte (si activé dans Paramètres)", type: "textarea",
    default: "Un acompte de {acompte} est demandé pour confirmer chaque rendez-vous. Les modalités de paiement vous sont communiquées par message privé après validation de votre demande." },
  { key: "cancellation_text", group: "Réservation", label: "Conditions d’annulation", type: "textarea",
    default: "Vous pouvez annuler ou déplacer votre rendez-vous jusqu’à {delai} à l’avance, via le lien reçu par e-mail. Merci de respecter ce délai : il permet de proposer le créneau à une autre cliente." },
  { key: "request_text", group: "Réservation", label: "Message après une demande", type: "textarea",
    default: "Votre demande a bien été transmise. Je la valide personnellement et vous recevrez une confirmation par e-mail dès que votre rendez-vous sera accepté." },
  // Mentions
  { key: "legal_name", group: "Mentions légales", label: "Nom de l’entreprise", type: "text", default: "Belavica" },
  { key: "legal_company_number", group: "Mentions légales", label: "Numéro d’entreprise (BCE)", type: "text", default: "",
    help: "Obligatoire en Belgique dès que l’activité est enregistrée : à compléter dès que vous l’avez." },
  { key: "legal_vat", group: "Mentions légales", label: "Numéro de TVA", type: "text", default: "" },
  { key: "legal_contact_email", group: "Mentions légales", label: "E-mail de contact (vie privée)", type: "text", default: "leona@belavica.com",
    help: "Affiché uniquement dans la politique de confidentialité, pour les demandes RGPD." },
];

export type SiteContent = Record<string, string>;

export function withDefaults(rows: { key: string; value: string }[]): SiteContent {
  const out: SiteContent = {};
  for (const f of CONTENT_FIELDS) out[f.key] = f.default;
  for (const r of rows) if (r.value.trim() !== "" || r.key.startsWith("legal_")) out[r.key] = r.value;
  return out;
}

export function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

import { getCatalog } from "@/lib/data";
import { db } from "@/lib/db";
import { PageTitle } from "@/components/admin/ui";
import { ManualBookingForm } from "./ManualBookingForm";

export const metadata = { title: "Nouveau rendez-vous" };

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<{ client?: string; date?: string }> }) {
  const sp = await searchParams;
  const catalog = await getCatalog(false);
  let client = null;
  if (sp.client && /^[0-9a-f-]{36}$/.test(sp.client)) {
    [client] = await db()<{ first_name: string; last_name: string; email: string; phone: string }[]>`
      select first_name, last_name, email, phone from clients where id = ${sp.client}`;
  }
  const services = catalog.flatMap((c) =>
    c.services.map((s) => ({
      id: s.id,
      label: `${c.name} · ${s.name}${s.visible ? "" : " (masquée)"}`,
      duration: s.duration_min,
      price: s.price_cents,
      variants: s.variants.map((v) => ({ id: v.id, name: v.name, duration: v.duration_min, price: v.price_cents })),
      options: s.options.map((o) => ({ id: o.id, name: o.name, duration: o.duration_min, price: o.price_cents })),
    })),
  );
  return (
    <>
      <PageTitle title="Nouveau rendez-vous" sub="Ajout manuel (rendez-vous pris par message, téléphone…). Il est directement confirmé." />
      <ManualBookingForm services={services} client={client ?? null} date={sp.date ?? ""} />
    </>
  );
}

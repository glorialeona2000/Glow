import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageTitle } from "@/components/admin/ui";
import { ServiceEditor } from "./ServiceEditor";

export const metadata = { title: "Modifier une prestation" };

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sql = db();
  const [[service], categories, variants, options, links] = await Promise.all([
    sql<{ id: string; category_id: string; name: string; description: string; highlights: string[]; note: string; price_cents: number | null; duration_min: number | null; booking_mode: string; requires_deposit: boolean; sort: number; visible: boolean; archived_at: Date | null }[]>`
      select id, category_id, name, description, highlights, note, price_cents, duration_min, booking_mode, requires_deposit, sort, visible, archived_at from services where id = ${id}`,
    sql<{ id: string; name: string }[]>`select id, name from categories order by sort`,
    sql<{ id: string; name: string; description: string; price_cents: number | null; duration_min: number | null; sort: number; visible: boolean }[]>`
      select id, name, description, price_cents, duration_min, sort, visible from service_variants where service_id = ${id} and archived_at is null order by sort, name`,
    sql<{ id: string; name: string }[]>`select id, name from service_options where archived_at is null order by sort, name`,
    sql<{ option_id: string }[]>`select option_id from service_option_links where service_id = ${id}`,
  ]);
  if (!service || service.archived_at) notFound();
  return (
    <>
      <PageTitle title={service.name} actions={<Link href="/admin/prestations" className="btn btn-outline min-h-11 px-5">← Retour</Link>} />
      <ServiceEditor service={service} categories={categories} variants={variants} options={options} linked={links.map((l) => l.option_id)} />
    </>
  );
}

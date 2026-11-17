import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/data";
import { formatDateShort } from "@/lib/time";
import { Card, Empty, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Clientes" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; supprime?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const like = `%${q.toLowerCase()}%`;
  const sql = db();
  const [rows, settings] = await Promise.all([
    sql<{ id: string; first_name: string; last_name: string; email: string; phone: string; n: number; last: Date | null; next: Date | null }[]>`
      select c.id, c.first_name, c.last_name, c.email, c.phone,
             count(b.id)::int as n,
             max(b.starts_at) filter (where b.starts_at < now() and b.status in ('confirmed','completed')) as last,
             min(b.starts_at) filter (where b.starts_at >= now() and b.status in ('pending','confirmed')) as next
      from clients c left join bookings b on b.client_id = c.id
      ${q ? sql`where lower(c.first_name || ' ' || c.last_name) like ${like} or lower(c.email) like ${like}
                 or replace(c.phone, ' ', '') like ${`%${q.replace(/\s/g, "")}%`}` : sql``}
      group by c.id
      order by c.last_name, c.first_name
      limit 200`,
    getSettings(),
  ]);
  return (
    <>
      <PageTitle title="Clientes" sub={`${rows.length} fiche(s)${rows.length === 200 ? " (200 premières)" : ""}`} />
      {sp.supprime && <p className="mb-6 border-l-2 border-success bg-success/5 px-4 py-3 text-sm text-success">Les données de la cliente ont été supprimées.</p>}
      <form className="mb-6 flex gap-3" role="search">
        <input name="q" defaultValue={q} placeholder="Nom, e-mail, téléphone…" className="field flex-1" />
        <button className="btn btn-primary min-h-12 px-6">Rechercher</button>
      </form>
      <Card>
        {rows.length ? (
          <ul>
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/clientes/${c.id}`} className="flex flex-col gap-1 border-b border-ink/10 py-3.5 last:border-0 hover:bg-cream md:flex-row md:items-center md:gap-6">
                  <span className="font-medium md:w-56">{c.first_name} {c.last_name}</span>
                  <span className="text-sm text-taupe md:flex-1">{c.email} · {c.phone}</span>
                  <span className="text-xs text-mute md:w-64 md:text-right">
                    {c.n} rdv
                    {c.last ? ` · dernier ${formatDateShort(c.last, settings.timezone)}` : ""}
                    {c.next ? ` · prochain ${formatDateShort(c.next, settings.timezone)}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Aucune cliente.</Empty>
        )}
      </Card>
    </>
  );
}

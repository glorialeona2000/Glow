import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { bookingsForClient } from "@/lib/admin-data";
import { BookingCard } from "@/components/admin/BookingCard";
import { Card, Empty, PageTitle } from "@/components/admin/ui";
import { ClientForms } from "./ClientForms";

export const metadata = { title: "Fiche cliente" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [c] = await db()<{ id: string; first_name: string; last_name: string; email: string; phone: string; notes: string; created_at: Date }[]>`
    select id, first_name, last_name, email, phone, notes, created_at from clients where id = ${id}`;
  if (!c) notFound();
  const history = await bookingsForClient(id);
  const spent = history.filter((b) => b.status === "completed").reduce((a, b) => a + (b.price_cents ?? 0), 0);
  return (
    <>
      <PageTitle
        title={`${c.first_name} ${c.last_name}`}
        sub={`${history.length} rendez-vous${spent ? ` · ${new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(spent / 100)} de prestations terminées` : ""}`}
        actions={
          <>
            <Link href={`/admin/reservations/nouvelle?client=${c.id}`} className="btn btn-primary min-h-11 px-5">+ Rendez-vous</Link>
            <Link href="/admin/clientes" className="btn btn-outline min-h-11 px-5">← Retour</Link>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <ClientForms c={c} />
        <Card title="Historique">
          {history.length ? history.map((b) => <BookingCard key={b.id} b={b} />) : <Empty>Aucun rendez-vous.</Empty>}
        </Card>
      </div>
    </>
  );
}

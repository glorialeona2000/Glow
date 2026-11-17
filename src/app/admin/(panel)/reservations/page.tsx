import Link from "next/link";
import { searchBookings } from "@/lib/admin-data";
import { BookingCard } from "@/components/admin/BookingCard";
import { Card, Empty, PageTitle, STATUS_LABEL } from "@/components/admin/ui";

export const metadata = { title: "Réservations" };

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const statut = sp.statut && STATUS_LABEL[sp.statut] ? sp.statut : "";
  const rows = await searchBookings(q, statut);
  return (
    <>
      <PageTitle
        title="Réservations"
        actions={<Link href="/admin/reservations/nouvelle" className="btn btn-primary min-h-11 px-5">+ Rendez-vous</Link>}
      />
      <form className="mb-6 flex flex-col gap-3 md:flex-row" role="search">
        <input name="q" defaultValue={q} placeholder="Nom, e-mail, téléphone, référence, prestation…" className="field flex-1" />
        <select name="statut" defaultValue={statut} className="field md:w-56">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button className="btn btn-primary min-h-12 px-6">Rechercher</button>
      </form>
      <Card>
        {rows.length ? rows.map((b) => <BookingCard key={b.id} b={b} />) : <Empty>Aucune réservation trouvée.</Empty>}
        {rows.length === 100 && <p className="mt-4 text-xs text-mute">100 premiers résultats affichés : affinez la recherche.</p>}
      </Card>
    </>
  );
}

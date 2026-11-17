import Link from "next/link";
import { db } from "@/lib/db";
import { getCatalog, servicePricing } from "@/lib/data";
import { formatPrice } from "@/lib/money";
import { formatDuration } from "@/lib/time";
import { Card, PageTitle } from "@/components/admin/ui";
import { CategoryForm, NewServiceForm, OptionForms } from "./CatalogForms";

export const metadata = { title: "Prestations" };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ supprime?: string }> }) {
  const sp = await searchParams;
  const [catalog, options] = await Promise.all([
    getCatalog(false),
    db()<{ id: string; name: string; description: string; price_cents: number | null; duration_min: number; active: boolean; sort: number }[]>`
      select id, name, description, price_cents, duration_min, active, sort from service_options where archived_at is null order by sort, name`,
  ]);
  return (
    <>
      <PageTitle title="Prestations" sub="Tarifs, durées, descriptions et visibilité. Une prestation sans prix ou durée n’est pas réservable en ligne." />
      {sp.supprime && <p className="mb-6 border-l-2 border-success bg-success/5 px-4 py-3 text-sm text-success">Prestation supprimée du site (l’historique des réservations est conservé).</p>}
      <div className="space-y-8">
        {catalog.map((c) => (
          <Card key={c.id} title={c.name} actions={!c.visible && <span className="text-xs text-mute">Catégorie masquée</span>}>
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {c.services.map((s) => {
                const p = servicePricing(s);
                const missing = s.booking_mode === "appointment" && !p.bookable;
                return (
                  <li key={s.id}>
                    <Link href={`/admin/prestations/${s.id}`} className="flex flex-col gap-1 py-3.5 hover:bg-cream md:flex-row md:items-center md:gap-6">
                      <span className="flex-1 font-medium">
                        {s.name}
                        {!s.visible && <span className="ml-2 text-xs font-normal text-mute">(masquée)</span>}
                      </span>
                      <span className={`text-sm md:w-64 md:text-right ${missing ? "text-warning" : "text-taupe"}`}>
                        {s.booking_mode === "request"
                          ? `Sur demande${s.price_cents != null ? ` · ${formatPrice(s.price_cents)}` : ""}`
                          : missing
                            ? "⚠ Prix / durée à compléter"
                            : `${p.hasVariants ? "dès " : ""}${formatPrice(p.fromPrice)} · ${formatDuration(p.duration!)}`}
                        {s.variants.length > 0 && ` · ${s.variants.length} formule(s)`}
                      </span>
                      <span className="text-xs underline md:w-16 md:text-right">Modifier</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <NewServiceForm categoryId={c.id} />
            <details className="mt-6 border-t border-ink/10 pt-4">
              <summary className="cursor-pointer text-sm underline">Modifier la catégorie (nom, texte, photo)</summary>
              <CategoryForm c={c} />
            </details>
          </Card>
        ))}
        <Card title="Options (suppléments)">
          <p className="mb-4 text-sm text-taupe">
            Une option (ex. French) s’ajoute à une prestation compatible : supplément de prix et de durée. Choisissez les prestations compatibles dans la fiche de chaque prestation.
          </p>
          <OptionForms options={options} />
        </Card>
      </div>
    </>
  );
}

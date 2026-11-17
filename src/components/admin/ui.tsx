import Link from "next/link";

export const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  declined: "Refusé",
  cancelled: "Annulé",
  completed: "Terminé",
  no_show: "Absente",
};
export const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  confirmed: "bg-success/10 text-success border-success/30",
  declined: "bg-ink/5 text-mute border-ink/10",
  cancelled: "bg-danger/5 text-danger border-danger/20",
  completed: "bg-ink/5 text-taupe border-ink/10",
  no_show: "bg-danger/5 text-danger border-danger/20",
};
export const DEPOSIT_LABEL: Record<string, string> = {
  none: "Pas d’acompte",
  awaiting: "Acompte à recevoir",
  received: "Acompte reçu",
  forfeited: "Acompte conservé",
  refunded: "Acompte remboursé",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block border px-2 py-0.5 text-[0.65rem] tracking-[0.12em] uppercase ${STATUS_STYLE[status] ?? ""}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Card({ title, children, actions, className = "" }: { title?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={`border border-ink/10 bg-white p-5 md:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="display text-xl">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="display text-3xl md:text-4xl">{title}</h1>
        {sub && <p className="mt-2 text-sm text-taupe">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-mute">{children}</p>;
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm underline decoration-ink/20 underline-offset-4 hover:decoration-ink">
      {children}
    </Link>
  );
}

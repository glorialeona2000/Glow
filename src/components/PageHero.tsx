import { Sparkle } from "./icons";

export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="bg-ink px-6 pt-32 pb-16 text-center text-ivory md:pt-40 md:pb-20">
      <Sparkle className="fade-in mx-auto size-3 text-champagne-light" />
      <p className="fade-in eyebrow mt-5 text-ivory/60">{eyebrow}</p>
      <h1 className="fade-in display mt-4 text-4xl md:text-6xl">{title}</h1>
      {children && <div className="fade-in-delay mx-auto mt-6 max-w-xl text-[0.98rem] leading-relaxed text-ivory/70">{children}</div>}
    </section>
  );
}

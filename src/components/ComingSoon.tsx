import Image from "next/image";
import { InstagramIcon, Sparkle } from "./icons";

export function ComingSoon({ instagram, city }: { instagram: string; city: string }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ivory px-6 py-16 text-center">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(55% 45% at 50% 40%, rgba(214,193,159,0.22), transparent 70%)" }}
      />
      {[
        ["14%", "20%", "0s"],
        ["84%", "26%", "1.3s"],
        ["22%", "74%", "2.2s"],
        ["78%", "70%", "0.7s"],
      ].map(([left, top, delay], i) => (
        <span key={i} aria-hidden className="twinkle absolute text-champagne" style={{ left, top, animationDelay: delay }}>
          <Sparkle className="size-2.5" />
        </span>
      ))}
      <div className="relative flex flex-col items-center">
        <Image
          src="/brand/logo-panthere.webp"
          alt="BELAVICA Beauty Studio"
          width={320}
          height={550}
          priority
          className="fade-in h-auto w-[190px] md:w-[240px]"
        />
        <p className="fade-in-delay eyebrow mt-12 text-champagne">Bientôt</p>
        <h1 className="fade-in-delay display mt-4 max-w-xl text-3xl text-balance md:text-5xl">Notre écrin en ligne ouvre très bientôt</h1>
        <p className="fade-in-delay-2 mt-6 max-w-md leading-relaxed text-taupe text-pretty">
          Maquillage, regard, ongles et soins du visage sur mesure à {city.replace(/, Belgique$/, "")}. En attendant l’ouverture de la
          réservation en ligne, retrouvez-moi sur Instagram.
        </p>
        <a
          href={`https://instagram.com/${instagram}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fade-in-delay-2 btn btn-primary mt-10"
        >
          <InstagramIcon className="size-4" /> @{instagram}
        </a>
        <p className="mt-16 text-[0.65rem] tracking-[0.3em] text-mute uppercase">{city}</p>
      </div>
    </main>
  );
}

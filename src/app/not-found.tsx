import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink px-6 text-center text-ivory">
      <p className="wordmark text-2xl">Belavica</p>
      <h1 className="display mt-8 text-4xl">Page introuvable</h1>
      <p className="mt-4 text-ivory/70">Ce lien n’existe pas ou n’est plus valide.</p>
      <Link href="/" className="btn btn-light mt-10">Retour à l’accueil</Link>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useActionState } from "react";
import { updatePassword } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input name="password" type="password" minLength={12} required autoComplete="new-password" placeholder="Nouveau mot de passe (12 caractères min.)" className="field" />
      <input name="confirm" type="password" minLength={12} required autoComplete="new-password" placeholder="Confirmer" className="field" />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">{state.ok} <Link className="underline" href="/admin">Aller à l’admin</Link></p>}
      <button className="btn btn-primary w-full" disabled={pending}>Enregistrer</button>
    </form>
  );
}

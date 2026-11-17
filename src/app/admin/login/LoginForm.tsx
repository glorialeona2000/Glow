"use client";
import { useActionState, useState } from "react";
import { requestPasswordReset, signIn } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [state, action, pending] = useActionState(signIn, null);
  const [rstate, raction, rpending] = useActionState(requestPasswordReset, null);

  if (mode === "reset") {
    return (
      <form action={raction} className="mt-10 space-y-4 bg-ivory p-6">
        <p className="text-sm text-taupe">Recevez un lien pour choisir un nouveau mot de passe.</p>
        <input name="email" type="email" required autoComplete="email" placeholder="E-mail" className="field" />
        {rstate?.ok && <p className="text-sm text-success">{rstate.ok}</p>}
        {rstate?.error && <p className="text-sm text-danger">{rstate.error}</p>}
        <button className="btn btn-primary w-full" disabled={rpending}>Envoyer le lien</button>
        <button type="button" className="w-full text-xs text-mute underline" onClick={() => setMode("login")}>Retour</button>
      </form>
    );
  }
  return (
    <form action={action} className="mt-10 space-y-4 bg-ivory p-6">
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
      </div>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
      <button type="button" className="w-full text-xs text-mute underline" onClick={() => setMode("reset")}>Mot de passe oublié ?</button>
    </form>
  );
}

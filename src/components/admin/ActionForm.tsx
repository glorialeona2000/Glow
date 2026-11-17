"use client";
import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import type { FormState } from "@/lib/form";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

const PendingContext = createContext(false);

/**
 * Formulaire admin : envoie vers une server action et affiche le résultat.
 * Les champs saisis sont conservés en cas d'erreur (pas de réinitialisation automatique).
 */
export function ActionForm({
  action,
  children,
  className = "",
  confirm,
  resetOnSuccess = false,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(fd));
      }}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      {state?.ok && (
        <p role="status" className="mt-3 text-sm text-success">
          {state.ok}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function Submit({ children, className = "btn btn-primary min-h-11 px-5", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const pending = useContext(PendingContext);
  return (
    <button type="submit" className={className} disabled={pending || rest.disabled} {...rest}>
      {pending ? "…" : children}
    </button>
  );
}

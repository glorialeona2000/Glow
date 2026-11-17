import { requireAdmin } from "@/lib/auth";
import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const admin = await requireAdmin();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink px-5">
      <div className="w-full max-w-sm bg-ivory p-6">
        <h1 className="display text-2xl">Nouveau mot de passe</h1>
        <p className="mt-2 text-sm text-taupe">{admin.email}</p>
        <PasswordForm />
      </div>
    </div>
  );
}

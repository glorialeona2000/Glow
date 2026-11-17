export type FormState = { ok?: string; error?: string; at?: number } | null;

export function s(fd: FormData, k: string, max = 2000): string {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
export function n(fd: FormData, k: string): number | null {
  const v = s(fd, k);
  if (v === "") return null;
  const x = Number(v.replace(",", "."));
  if (!Number.isFinite(x)) throw new Error(`Valeur numérique invalide (${k})`);
  return Math.round(x);
}
export function b(fd: FormData, k: string): boolean {
  const v = fd.get(k);
  return v === "on" || v === "true" || v === "1";
}
export function ok(msg: string): FormState {
  return { ok: msg, at: Date.now() };
}
export function err(msg: string): FormState {
  return { error: msg, at: Date.now() };
}

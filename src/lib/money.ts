export function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return "";
  const euros = cents / 100;
  return new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
  }).format(euros);
}

/** "45" / "45,50" / "45.5" -> 4550 ; vide -> null */
export function parsePriceToCents(input: string): number | null {
  const s = input.trim().replace(/\s|€/g, "").replace(",", ".");
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error("Prix invalide");
  return Math.round(Number(s) * 100);
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(/\.00$/, "").replace(".", ",");
}

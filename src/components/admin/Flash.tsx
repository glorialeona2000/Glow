"use client";
import { useEffect, useState } from "react";

export function Flash({ raw }: { raw: string | null }) {
  const [hidden, setHidden] = useState<string | null>(null);
  useEffect(() => {
    if (raw) document.cookie = "admin_flash=; Max-Age=0; path=/admin";
  }, [raw]);
  if (!raw || hidden === raw) return null;
  const msg = decodeURIComponent(raw);
  const isError = msg.startsWith("!");
  return (
    <div role="status" className={`mb-6 flex items-start justify-between gap-4 border-l-2 px-4 py-3 text-sm ${isError ? "border-danger bg-danger/5 text-danger" : "border-success bg-success/5 text-success"}`}>
      <span>{isError ? msg.slice(1) : msg}</span>
      <button type="button" onClick={() => setHidden(raw)} aria-label="Fermer" className="text-lg leading-none">×</button>
    </div>
  );
}

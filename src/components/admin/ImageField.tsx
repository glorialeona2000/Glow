"use client";
import { useRef, useState } from "react";
import { uploadImage } from "@/app/admin/actions";

/** Redimensionne l'image dans le navigateur (photos d'iPhone) avant l'envoi. */
async function downscale(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.9));
}

export function ImageField({ name, defaultValue, label = "Photo" }: { name: string; defaultValue?: string | null; label?: string }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-4">
        <div className="size-20 shrink-0 overflow-hidden bg-sand">
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="size-full object-cover" />
          )}
        </div>
        <div className="space-y-2">
          <button type="button" className="btn btn-outline min-h-10 px-4" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Envoi…" : url ? "Changer" : "Ajouter une photo"}
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>
      <input type="hidden" name={name} value={url} />
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setError(null);
          try {
            const blob = await downscale(f);
            const fd = new FormData();
            fd.append("file", new File([blob], "photo.jpg", { type: blob.type || f.type }));
            const r = await uploadImage(fd);
            if (r.url) setUrl(r.url);
            else setError(r.error ?? "Échec");
          } catch {
            setError("Échec du téléversement.");
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}

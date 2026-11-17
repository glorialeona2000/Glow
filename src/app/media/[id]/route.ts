import { db } from "@/lib/db";

// Images téléversées depuis l'admin. URL immuable (nouvel id à chaque envoi) : mise en cache longue.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const clean = id.replace(/\.\w+$/, "");
  if (!/^[0-9a-f-]{36}$/.test(clean)) return new Response("Not found", { status: 404 });
  const [m] = await db()<{ content_type: string; bytes: Buffer }[]>`select content_type, bytes from media where id = ${clean}`;
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(m.bytes), {
    headers: {
      "Content-Type": m.content_type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Netlify-CDN-Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

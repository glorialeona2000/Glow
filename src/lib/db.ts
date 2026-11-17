import "server-only";
import postgres from "postgres";

declare global {
  var __belavicaSql: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL n'est pas configurée.");
  }
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return postgres(url, {
    // Pooler Supabase (mode transaction) : pas de requêtes préparées
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: isLocal ? false : "require",
    transform: { undefined: null },
    onnotice: () => {},
  });
}

export function db() {
  if (!globalThis.__belavicaSql) globalThis.__belavicaSql = createClient();
  return globalThis.__belavicaSql;
}

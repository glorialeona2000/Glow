import { defineConfig, devices } from "@playwright/test";

// Tests de bout en bout. Prérequis : PostgreSQL local (postgres/postgres sur localhost).
// `npm run test:e2e` compile le site avec l'URL du faux Supabase, recrée la base de test,
// démarre le faux serveur (Auth + e-mails) et le site, puis joue les scénarios.
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: "http://localhost:3000", trace: "off", locale: "fr-BE", timezoneId: "Europe/Brussels" },
  projects: [{ name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } }],
  webServer: [
    { command: "node tests/e2e/mock-supabase-auth.mjs", port: 54321, reuseExistingServer: true },
    {
      command: "npx next start -p 3000",
      port: 3000,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432/belavica",
        SITE_URL: "http://localhost:3000",
        APP_SECRET: "local-dev-secret-local-dev-secret-0123456789",
        CRON_SECRET: "local-cron-secret-0123456789abcdef",
        IP_HASH_SALT: "test",
        ADMIN_EMAILS: "leona@belavica.com",
        RESEND_API_KEY: "re_test",
        RESEND_API_URL: "http://localhost:54321",
        EMAIL_FROM: "BELAVICA <reservations@belavica.com>",
      },
    },
  ],
});

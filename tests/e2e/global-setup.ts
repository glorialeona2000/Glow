import { execSync } from "node:child_process";

export default function globalSetup() {
  execSync("bash tests/e2e/reset-db.sh", { stdio: "inherit" });
}

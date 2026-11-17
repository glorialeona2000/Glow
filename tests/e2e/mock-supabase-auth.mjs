// Faux serveur Supabase Auth + Resend, UNIQUEMENT pour les tests locaux.
// Il imite les points d'entrée utilisés par l'espace admin (connexion, utilisateur, déconnexion).
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.MOCK_AUTH_PORT || 54321);
const USERS = {
  "leona@belavica.com": "test-password-123",
  "intrus@example.com": "test-password-123",
};
const tokens = new Map();
const sent = [];

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function session(email) {
  const sub = crypto.createHash("md5").update(email).digest("hex").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const access = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, email, exp, role: "authenticated", aud: "authenticated" })}.${crypto.randomBytes(16).toString("base64url")}`;
  const refresh = crypto.randomBytes(16).toString("hex");
  const user = { id: sub, aud: "authenticated", role: "authenticated", email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  tokens.set(access, user);
  tokens.set(`r:${refresh}`, user);
  return { access_token: access, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: refresh, user };
}

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const send = (code, obj) => {
        res.writeHead(code, { "content-type": "application/json" });
        res.end(obj === undefined ? "" : JSON.stringify(obj));
      };
      const json = body ? JSON.parse(body) : {};
      if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
        if (USERS[json.email] && USERS[json.email] === json.password) return send(200, session(json.email));
        return send(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
      }
      if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "refresh_token") {
        const u = tokens.get(`r:${json.refresh_token}`);
        return u ? send(200, session(u.email)) : send(400, { error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
      }
      if (url.pathname === "/auth/v1/user") {
        const t = (req.headers.authorization || "").replace("Bearer ", "");
        const u = tokens.get(t);
        return u ? send(200, u) : send(401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
      }
      // Faux Resend : échec volontaire pour les adresses contenant "echec"
      if (url.pathname === "/emails" && req.method === "POST") {
        if ((req.headers.authorization || "") !== "Bearer re_test") return send(401, { name: "validation_error", message: "API key is invalid" });
        if (JSON.stringify(json.to).includes("echec")) return send(422, { name: "validation_error", message: "Destinataire refusé (test)" });
        sent.push(json);
        return send(200, { id: crypto.randomUUID() });
      }
      if (url.pathname === "/__sent") return send(200, sent);
      if (url.pathname === "/auth/v1/logout") {
        tokens.delete((req.headers.authorization || "").replace("Bearer ", ""));
        res.writeHead(204);
        return res.end();
      }
      send(404, { msg: "not mocked" });
    });
  })
  .listen(PORT, () => console.log(`mock auth on ${PORT}`));

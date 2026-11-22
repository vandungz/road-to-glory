import assert from "node:assert/strict";
import { createServer, connect, type ConnectionOptions } from "node:tls";
import pg from "pg";
import { X509Certificate } from "node:crypto";
import { databaseConnectionConfig } from "../lib/database-connection";
import { supabasePoolerCA } from "../lib/security/supabase-ca";
import fixture from "./fixtures/dummy-tls.json";

const url = "postgresql://dummy:dummy-password@localhost:5432/dummy";
const production = { NODE_ENV: "production" } as const;
const verified = databaseConnectionConfig(`${url}?sslmode=require`, production);
assert.deepEqual(verified.ssl, { rejectUnauthorized: true });
const poolerUrl = "postgresql://dummy:dummy@aws-0-ap-southeast-1.pooler.supabase.com:5432/dummy";
assert.deepEqual(databaseConnectionConfig(poolerUrl, production).ssl, { rejectUnauthorized: true, ca: supabasePoolerCA });
assert.deepEqual(databaseConnectionConfig(poolerUrl, { ...production, PGSSL_CA: fixture.ca }).ssl, { rejectUnauthorized: true, ca: fixture.ca.trim() });
assert.deepEqual(databaseConnectionConfig(poolerUrl.replace(".com:", ".com.attacker.invalid:"), production).ssl, { rejectUnauthorized: true });
const providerCA = new X509Certificate(supabasePoolerCA);
assert.equal(providerCA.ca, true);
assert.equal(providerCA.fingerprint256, "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA");
assert.ok(Date.parse(providerCA.validTo) > Date.now(), "Bundled provider CA must not expire unnoticed");
const effective = new pg.Client(verified) as unknown as { connectionParameters: { ssl: ConnectionOptions } };
assert.equal(effective.connectionParameters.ssl.rejectUnauthorized, true);
assert.deepEqual(databaseConnectionConfig(url, { ...production, PGSSL_CA: fixture.ca }).ssl, { rejectUnauthorized: true, ca: fixture.ca.trim() });
for (const query of ["sslmode=disable", "sslmode=prefer", "sslmode=allow", "sslmode=no-verify", "sslmode=unknown", "sslmode=require&sslmode=disable", "ssl=0", "ssl=no-verify", "sslrootcert=/tmp/file", "sslcert=/tmp/file", "sslkey=/tmp/key", "SSLmode=disable", "%73sl=no-verify", "uselibpqcompat=true", "host=/tmp", "host=attacker.invalid", "hostaddr=127.0.0.1", "user=other", "password=other"]) {
  assert.throws(() => databaseConnectionConfig(`${url}?${query}`, production), Error, query);
}
for (const value of ["not a URL dummy-password", "https://dummy:dummy-password@localhost/test", "postgresql:///test", "postgresql://%2ftmp/test"]) {
  assert.throws(() => databaseConnectionConfig(value, production), (error: Error) => !error.message.includes("dummy-password"));
}
assert.throws(() => databaseConnectionConfig(url, { ...production, PG_SSL_REJECT_UNAUTHORIZED: "false" }));
assert.equal(databaseConnectionConfig(`${url}?sslmode=disable`, { NODE_ENV: "development" }).ssl, false);
assert.equal(databaseConnectionConfig(`${url}?sslmode=disable`, { NODE_ENV: "test" }).ssl, false);
assert.throws(() => databaseConnectionConfig("postgresql://dummy:dummy@remote.invalid/db?sslmode=disable", { NODE_ENV: "development" }));
assert.throws(() => databaseConnectionConfig(`${url}?sslmode=disable`, {}));
for (const mode of ["require", "verify-ca", "verify-full"]) {
  assert.equal((databaseConnectionConfig(`${url}?sslmode=${mode}`, production).ssl as ConnectionOptions).rejectUnauthorized, true);
}

async function handshake(certificate: string, ca: string): Promise<string> {
  const server = createServer({ key: fixture.key, cert: certificate });
  server.on("tlsClientError", () => {});
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const config = databaseConnectionConfig(url, { ...production, PGSSL_CA: ca });
  try {
    return await new Promise<string>((resolve) => {
      const socket = connect({ host: "127.0.0.1", port: address.port, servername: "localhost", ...(config.ssl as ConnectionOptions) });
      const finish = (result: string) => { socket.destroy(); resolve(result); };
      socket.setTimeout(3000, () => finish("TIMEOUT"));
      socket.once("secureConnect", () => finish(socket.authorized ? "VERIFIED" : "UNAUTHORIZED"));
      socket.once("error", (error: NodeJS.ErrnoException) => finish(error.code ?? "ERROR"));
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function main() {
  assert.equal(await handshake(fixture.certificate, fixture.ca), "VERIFIED");
  const untrusted = await handshake(fixture.certificate, fixture.untrustedCA);
  assert.ok(["SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"].includes(untrusted), `Untrusted CA must fail: ${untrusted}`);
  assert.equal(await handshake(fixture.wrongHostnameCertificate, fixture.ca), "ERR_TLS_CERT_ALTNAME_INVALID");
  console.log("Database TLS: URL overrides rejected; trusted peer accepted; untrusted CA and wrong hostname rejected on isolated loopback.");
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });

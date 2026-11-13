// Applies db/schema.sql and (optionally) db/seed.sql to DATABASE_URL.
// Usage: node --env-file-if-exists=.env.local scripts/db-init.mjs [--seed] [--reset] [--test]
// --test targets TEST_DATABASE_URL instead of DATABASE_URL, so --reset can never touch the dev database.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

const args = new Set(process.argv.slice(2));
const urlVar = args.has("--test") ? "TEST_DATABASE_URL" : "DATABASE_URL";
const url = process.env[urlVar];
if (!url) {
  console.error(`${urlVar} is not set`);
  process.exit(1);
}

const read = (name) =>
  readFile(fileURLToPath(new URL(`../db/${name}`, import.meta.url)), "utf8");

const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  if (args.has("--reset")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Refusing to --reset in production");
    }
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    console.log("schema reset");
  }
  await client.query(await read("schema.sql"));
  console.log("schema applied");
  if (args.has("--seed")) {
    await client.query(await read("seed.sql"));
    console.log("seed applied");
  }
} catch (error) {
  console.error(`db-init failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
} finally {
  await client.end();
}

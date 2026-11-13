import "server-only";
import { io } from "next/cache";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { log } from "./log";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };

// Created lazily so `next build` does not need a database.
function getPool(): Pool {
  if (!globalForPg.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 10_000,
    });
    pool.on("error", (error) => {
      log.error("pg idle client error", { error: error.message });
    });
    globalForPg.__pgPool = pool;
  }
  return globalForPg.__pgPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  // Cache Components: keep database reads out of build-time prerendering.
  await io();
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  await io();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  const pool = globalForPg.__pgPool;
  globalForPg.__pgPool = undefined;
  await pool?.end();
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "23505"
  );
}

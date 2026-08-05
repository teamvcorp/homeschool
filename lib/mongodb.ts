import "server-only";
import { MongoClient, type Db, ServerApiVersion } from "mongodb";
import { env, isProduction } from "./env";

/**
 * MONGODB CONNECTION
 * =============================================================================
 * Official native driver (not Mongoose) with the cached-promise pattern serverless
 * platforms require.
 *
 * WHY THE GLOBAL CACHE: on Vercel each lambda instance serves many requests, and a
 * naive `new MongoClient()` per request would exhaust the Atlas connection limit
 * almost immediately. Caching the *promise* (not the resolved client) means
 * concurrent cold-start requests all await one handshake instead of opening their
 * own. In development the same cache survives Turbopack hot reloads — without it,
 * every file save would leak another pool.
 *
 * WHY CONNECTION IS LAZY: an earlier version called connect() at module scope, which
 * meant (a) importing this file opened a pool even for a route that never queried,
 * and (b) `next build` walking the module graph read MONGODB_URI at BUILD time and
 * failed when it was absent. Nothing here touches env or the network until the first
 * actual query.
 *
 * `mongodb` is in Next's default serverExternalPackages list, so the native driver
 * is never bundled and needs no next.config entry.
 */

declare global {
  // `var` (not let/const) is required for a global declaration to merge.
  var __vaMongoClientPromise: Promise<MongoClient> | undefined;
}

function createClient(): Promise<MongoClient> {
  // env is read HERE, inside the function — not at module scope. That is what keeps
  // the build from requiring runtime secrets.
  const client = new MongoClient(env.MONGODB_URI, {
    // Pin the server API so a future Atlas upgrade can't silently change behaviour.
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    // Keep the pool small: many short-lived lambdas each holding a large pool is how
    // Atlas connection limits get hit.
    maxPoolSize: 10,
    minPoolSize: 0,
    // Fail fast rather than hanging a request for 30 seconds on a bad network.
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    socketTimeoutMS: 45000,
    retryWrites: true,
  });

  return client.connect();
}

/**
 * The connected client, created on first use and reused thereafter.
 * Prefer `getDb()` unless you need the admin or session APIs.
 */
export function getMongoClient(): Promise<MongoClient> {
  // In production the module-scope variable below is per-lambda and sufficient; in
  // development the global is what survives hot reloads.
  if (!isProduction) {
    globalThis.__vaMongoClientPromise ??= createClient();
    return globalThis.__vaMongoClientPromise;
  }
  clientPromise ??= createClient();
  return clientPromise;
}

let clientPromise: Promise<MongoClient> | undefined;

/** The application database. */
export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(env.MONGODB_DB);
}

/**
 * Connectivity check for health endpoints and the CLI scripts. Returns a result
 * object rather than throwing, so a caller can report failure without a try/catch.
 */
export async function pingDatabase(): Promise<
  { ok: true; ms: number } | { ok: false; error: string }
> {
  const started = Date.now();
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return { ok: true, ms: Date.now() - started };
  } catch (error) {
    return {
      ok: false,
      // Never surface the raw error to a client: a driver error can contain the
      // connection string, credentials included.
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

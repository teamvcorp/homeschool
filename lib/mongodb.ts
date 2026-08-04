import "server-only";
import { MongoClient, type Db, ServerApiVersion } from "mongodb";
import { env } from "./env";

/**
 * MONGODB CONNECTION
 * =============================================================================
 * Uses the official native driver (not Mongoose) with the cached-promise pattern
 * that serverless platforms require.
 *
 * WHY THE GLOBAL CACHE: on Vercel, each lambda instance may serve many requests,
 * and a naive `new MongoClient()` per request would exhaust the Atlas connection
 * limit almost immediately. Caching the *promise* (not the resolved client) on
 * globalThis means concurrent cold-start requests all await the same in-flight
 * handshake rather than each opening their own.
 *
 * In development the same cache survives Turbopack hot reloads — without it,
 * every file save would leak another pool until Atlas refused connections.
 *
 * `mongodb` is in Next's default serverExternalPackages list, so the native
 * driver is never bundled and needs no next.config entry.
 */

// Declaration merging so the global cache typechecks under `strict`.
declare global {
  // `var` (not let/const) is required for a global declaration to merge.
  var __vaMongoClientPromise: Promise<MongoClient> | undefined;
}

function createClient(): Promise<MongoClient> {
  const client = new MongoClient(env.MONGODB_URI, {
    // Pin the server API so a future Atlas upgrade can't silently change
    // behaviour under us.
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    // Keep the pool small: many short-lived lambdas each holding a large pool is
    // how Atlas connection limits get hit.
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
 * Cached client promise. Reused across invocations and hot reloads.
 */
const clientPromise: Promise<MongoClient> =
  globalThis.__vaMongoClientPromise ?? createClient();

if (env.NODE_ENV !== "production") {
  // Only cache on the global in dev; in production each lambda gets a fresh
  // module scope anyway and the module-level const is sufficient.
  globalThis.__vaMongoClientPromise = clientPromise;
}

/** The connected client. Prefer `getDb()` unless you need admin/session APIs. */
export function getMongoClient(): Promise<MongoClient> {
  return clientPromise;
}

/** The application database. */
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(env.MONGODB_DB);
}

/**
 * Connectivity check for health endpoints and the db:init script. Returns a
 * result object rather than throwing, so a caller can report a failure without
 * a try/catch dance.
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
      // connection string, including credentials.
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

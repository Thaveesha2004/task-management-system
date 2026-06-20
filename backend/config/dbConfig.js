function isRenderHost() {
  return Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID);
}

/**
 * Render cannot reach Supabase direct host over IPv6 (ENETUNREACH).
 * Rewrite direct db.*.supabase.co URLs to Session pooler on Render.
 */
function normalizeDatabaseUrl(url) {
  if (!url) return url;

  const usePooler =
    process.env.USE_SUPABASE_POOLER === 'true' ||
    process.env.SUPABASE_POOLER_URL ||
    isRenderHost();

  if (!usePooler) return url;

  if (process.env.SUPABASE_POOLER_URL) {
    return process.env.SUPABASE_POOLER_URL;
  }

  const directMatch = url.match(
    /^postgres(?:ql)?:\/\/postgres:([^@]+)@db\.([^.]+)\.supabase\.co(?::\d+)?\/([^?]+)/
  );

  if (!directMatch) return url;

  const [, password, projectRef, database] = directMatch;
  const poolerHost =
    process.env.SUPABASE_POOLER_HOST || 'aws-0-ap-southeast-1.pooler.supabase.com';
  const poolerUser = `postgres.${projectRef}`;

  return `postgresql://${poolerUser}:${password}@${poolerHost}:5432/${database}`;
}

function parseDatabaseUrl(url) {
  const normalizedUrl = normalizeDatabaseUrl(url);
  const parsed = new URL(normalizedUrl);
  const isRemote = parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1';
  const useSsl = process.env.DB_SSL === 'true' || isRemote;

  parsed.searchParams.delete('sslmode');

  return {
    connectionString: parsed.toString(),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}

function getPoolConfig() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_POOLER_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_PRIVATE_URL;

  if (databaseUrl) {
    return parseDatabaseUrl(databaseUrl);
  }

  const isRemote =
    process.env.DB_HOST &&
    process.env.DB_HOST !== 'localhost' &&
    process.env.DB_HOST !== '127.0.0.1';
  const useSsl = process.env.DB_SSL === 'true' || isRemote;

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'tms_db',
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}

function hasDatabaseConfig() {
  return Boolean(
    process.env.DATABASE_URL ||
      process.env.SUPABASE_POOLER_URL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_PRIVATE_URL ||
      (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME)
  );
}

module.exports = { getPoolConfig, hasDatabaseConfig, normalizeDatabaseUrl };

function parseDatabaseUrl(url) {
  const parsed = new URL(url);
  const isRemote = parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1';
  const useSsl = process.env.DB_SSL === 'true' || isRemote;

  // Let pg use our ssl config; sslmode=require in the URL can ignore rejectUnauthorized
  parsed.searchParams.delete('sslmode');

  return {
    connectionString: parsed.toString(),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}

function getPoolConfig() {
  const databaseUrl =
    process.env.DATABASE_URL ||
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
      process.env.POSTGRES_URL ||
      process.env.DATABASE_PRIVATE_URL ||
      (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME)
  );
}

module.exports = { getPoolConfig, hasDatabaseConfig };

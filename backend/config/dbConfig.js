function parseDatabaseUrl(url) {
  const parsed = new URL(url);
  const isRemote = parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1';
  const useSsl = process.env.DB_SSL === 'true' || isRemote;

  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}

function getPoolConfig() {
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

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
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}

function hasDatabaseConfig() {
  return Boolean(
    process.env.DATABASE_URL ||
      process.env.MYSQL_URL ||
      (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME)
  );
}

module.exports = { getPoolConfig, hasDatabaseConfig };

const DEFAULT_PROJECT_REF = 'pxivckosjllfhzpzbqac';

const POOLER_HOSTS = [
  process.env.SUPABASE_POOLER_HOST,
  'aws-0-ap-southeast-1.pooler.supabase.com',
  'aws-1-ap-southeast-1.pooler.supabase.com',
].filter(Boolean);

function isRenderHost() {
  return Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID);
}

function parsePostgresUrl(url) {
  const parsed = new URL(url);
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: Number(parsed.port) || 5432,
    database: parsed.pathname.replace(/^\//, '') || 'postgres',
  };
}

function extractProjectRef(urlOrHost, user) {
  if (process.env.SUPABASE_PROJECT_REF) {
    return process.env.SUPABASE_PROJECT_REF;
  }

  const host = typeof urlOrHost === 'string' ? urlOrHost : urlOrHost.host;
  const hostMatch = host.match(/^db\.([^.]+)\.supabase\.co$/);
  if (hostMatch) return hostMatch[1];

  const userMatch = user?.match(/^postgres\.([^.]+)$/);
  if (userMatch) return userMatch[1];

  return DEFAULT_PROJECT_REF;
}

function shouldUsePooler(url, parsed) {
  if (parsed.host.includes('pooler.supabase.com')) return false;
  if (parsed.host.includes('supabase.co')) {
    return Boolean(
      process.env.USE_SUPABASE_POOLER === 'true' ||
        process.env.SUPABASE_POOLER_URL ||
        process.env.SUPABASE_POOLER_HOST ||
        isRenderHost()
    );
  }
  return false;
}

function buildPoolerAttempts(parsed) {
  const projectRef = extractProjectRef(parsed.host, parsed.user);
  const password = parsed.password;
  const database = parsed.database || 'postgres';

  // Session pooler (5432) only — transaction mode (6543) breaks parameterized queries
  // with node-pg on long-lived hosts like Render.
  return POOLER_HOSTS.map((host) => ({
    label: `${host}:5432 (session)`,
    host,
    port: 5432,
    user: `postgres.${projectRef}`,
    password,
    database,
  }));
}

function toPgConfig(parsed) {
  const isRemote = parsed.host !== 'localhost' && parsed.host !== '127.0.0.1';
  const useSsl = process.env.DB_SSL === 'true' || isRemote;

  return {
    host: parsed.host,
    port: parsed.port,
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}

function candidateKey(candidate) {
  return `${candidate.host}:${candidate.port}:${candidate.user}:${candidate.database}`;
}

function addCandidate(candidates, seen, candidate) {
  const key = candidateKey(candidate);
  if (seen.has(key)) return;
  seen.add(key);
  candidates.push(candidate);
}

function buildSupabaseCandidates(password, database = 'postgres') {
  const projectRef = extractProjectRef(process.env.DB_HOST, process.env.DB_USER);
  const hosts = [...new Set(POOLER_HOSTS)];
  const candidates = hosts.map((host) => ({
    label: `${host}:5432 (session pooler)`,
    host,
    port: 5432,
    user: `postgres.${projectRef}`,
    password,
    database,
    ssl: { rejectUnauthorized: false },
  }));

  candidates.push({
    label: `db.${projectRef}.supabase.co:5432 (direct)`,
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password,
    database,
    ssl: { rejectUnauthorized: false },
  });

  return candidates;
}

function isSupabaseSplitConfig() {
  return (
    process.env.DB_HOST?.includes('supabase') ||
    process.env.DB_USER?.startsWith('postgres.')
  );
}

function splitEnvConfig() {
  const isRemote =
    process.env.DB_HOST !== 'localhost' &&
    process.env.DB_HOST !== '127.0.0.1';
  const useSsl = process.env.DB_SSL === 'true' || isRemote;

  return {
    label: `${process.env.DB_HOST}:${process.env.DB_PORT || 5432}`,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}

function configsFromDatabaseUrl(databaseUrl) {
  const parsed = parsePostgresUrl(databaseUrl);

  if (shouldUsePooler(databaseUrl, parsed)) {
    const poolerConfigs = buildPoolerAttempts(parsed);
    const directConfig = buildSupabaseCandidates(parsed.password, parsed.database).slice(-1);
    return [...poolerConfigs, ...directConfig];
  }

  return [{ ...toPgConfig(parsed), label: `${parsed.host}:${parsed.port}` }];
}

function getConnectionCandidates() {
  const candidates = [];
  const seen = new Set();
  const useLocalDb = process.env.USE_LOCAL_DB === 'true';
  const hasSplitConfig =
    process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME;

  if (hasSplitConfig && (useLocalDb || process.env.DB_HOST !== 'localhost')) {
    if (!useLocalDb && isSupabaseSplitConfig()) {
      for (const config of buildSupabaseCandidates(
        process.env.DB_PASSWORD,
        process.env.DB_NAME || 'postgres'
      )) {
        addCandidate(candidates, seen, config);
      }
    } else {
      addCandidate(candidates, seen, splitEnvConfig());
    }
  }

  const splitUsesRemotePooler =
    hasSplitConfig &&
    process.env.DB_HOST &&
    process.env.DB_HOST.includes('pooler.supabase.com');

  const remoteUrls = [
    process.env.REMOTE_DATABASE_URL,
    process.env.SUPABASE_POOLER_URL,
    useLocalDb || splitUsesRemotePooler ? null : process.env.DATABASE_URL,
    useLocalDb ? null : process.env.POSTGRES_URL,
    useLocalDb ? null : process.env.DATABASE_PRIVATE_URL,
  ].filter(Boolean);

  for (const databaseUrl of remoteUrls) {
    for (const config of configsFromDatabaseUrl(databaseUrl)) {
      addCandidate(candidates, seen, config);
    }
  }

  if (!useLocalDb && hasSplitConfig && process.env.DB_HOST === 'localhost') {
    // When USE_LOCAL_DB is not set, still allow an explicit localhost override via split vars.
    addCandidate(candidates, seen, splitEnvConfig());
  }

  if (candidates.length > 0) {
    return candidates;
  }

  return [
    {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'tms_db',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      label: 'localhost:5432',
    },
  ];
}

function getPoolConfig() {
  return getConnectionCandidates()[0];
}

function hasDatabaseConfig() {
  return Boolean(
    process.env.DATABASE_URL ||
      process.env.REMOTE_DATABASE_URL ||
      process.env.SUPABASE_POOLER_URL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_PRIVATE_URL ||
      (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME)
  );
}

function normalizeDatabaseUrl(url) {
  if (!url) return url;
  const parsed = parsePostgresUrl(url);
  if (!shouldUsePooler(url, parsed)) return url;
  const attempt = buildPoolerAttempts(parsed)[0];
  return `postgresql://${attempt.user}:${encodeURIComponent(attempt.password)}@${attempt.host}:${attempt.port}/${attempt.database}`;
}

module.exports = {
  getPoolConfig,
  getConnectionCandidates,
  hasDatabaseConfig,
  normalizeDatabaseUrl,
};

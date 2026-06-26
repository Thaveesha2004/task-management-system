const dns = require('dns');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { getConnectionCandidates } = require('./dbConfig');

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ override: true });

let pool = null;
let activeConfigLabel = null;
let connecting = null;

const STALE_CONNECTION =
  /connection is in closed state|Connection terminated|ECONNRESET|ENOTFOUND|ETIMEDOUT|connection timeout|All database connection attempts failed/i;

function attachPoolErrorHandler(activePool) {
  activePool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err.message);
    if (pool === activePool) {
      pool = null;
      activeConfigLabel = null;
    }
  });
}

async function connectWithFallback() {
  if (connecting) return connecting;

  connecting = (async () => {
    const candidates = getConnectionCandidates();

    for (const candidate of candidates) {
      const label = candidate.label || `${candidate.host}:${candidate.port}`;
      const config = {
        host: candidate.host,
        port: candidate.port,
        user: candidate.user,
        password: candidate.password,
        database: candidate.database,
        ...(candidate.ssl ? { ssl: candidate.ssl } : {}),
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 30_000,
        keepAlive: true,
        family: 4,
      };
      const testPool = new Pool(config);

      try {
        await testPool.query('SELECT 1 AS ok');
        if (pool) {
          await pool.end().catch(() => {});
        }
        pool = testPool;
        activeConfigLabel = label;
        attachPoolErrorHandler(testPool);
        console.log(`PostgreSQL connected via ${label}`);
        return pool;
      } catch (error) {
        console.error(`Database attempt failed (${label}): ${error.message}`);
        await testPool.end().catch(() => {});
      }
    }

    throw new Error('All database connection attempts failed');
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

async function getPool() {
  if (!pool) {
    await connectWithFallback();
  }
  return pool;
}

function buildQueryConfig(sql, params = []) {
  const values = Array.isArray(params) ? params : [];
  const pgSql = toPgSql(sql);
  return values.length > 0 ? { text: pgSql, values, queryMode: 'simple' } : pgSql;
}

async function runQuery(pgSql, params = []) {
  const queryConfig = typeof pgSql === 'string' ? buildQueryConfig(pgSql, params) : pgSql;

  try {
    const activePool = await getPool();
    return await activePool.query(queryConfig);
  } catch (err) {
    if (STALE_CONNECTION.test(err.message)) {
      pool = null;
      activeConfigLabel = null;
      const activePool = await connectWithFallback();
      return activePool.query(queryConfig);
    }
    throw err;
  }
}

async function runTransaction(callback) {
  const activePool = await getPool();
  const client = await activePool.connect();
  const txQuery = (sql, params = []) => client.query(buildQueryConfig(sql, params));

  try {
    await client.query('BEGIN');
    const result = await callback(txQuery);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function toPgSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function isSelectQuery(sql) {
  return /^\s*select\b/i.test(sql);
}

function toMutationResult(result) {
  const row = result.rows[0];
  return {
    affectedRows: result.rowCount,
    insertId: row?.id,
    createdAt: row?.created_at,
  };
}

function query(sql, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  const pgSql = toPgSql(sql);

  runQuery(pgSql, params)
    .then((result) => {
      if (isSelectQuery(sql)) {
        callback(null, result.rows);
        return;
      }
      callback(null, toMutationResult(result));
    })
    .catch((err) => callback(err));
}

const db = {
  query,
  promise: () => ({
    query: (sql, params = []) =>
      runQuery(toPgSql(sql), params).then((result) => [result.rows, result.fields]),
  }),
  runTransaction,
  connectWithFallback,
  getActiveConfigLabel: () => activeConfigLabel,
};

module.exports = db;

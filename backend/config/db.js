const dns = require('dns');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { getPoolConfig } = require('./dbConfig');

// Render and other hosts often fail on Supabase direct IPv6 (ENETUNREACH)
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const pool = new Pool(getPoolConfig());

function toPgSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function isSelectQuery(sql) {
  return /^\s*select\b/i.test(sql);
}

function toMutationResult(result) {
  return {
    affectedRows: result.rowCount,
    insertId: result.rows[0]?.id,
  };
}

function query(sql, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  const pgSql = toPgSql(sql);

  pool
    .query(pgSql, params)
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
      pool.query(toPgSql(sql), params).then((result) => [result.rows, result.fields]),
  }),
};

pool
  .query('SELECT 1')
  .then(() => {
    console.log('PostgreSQL database connected successfully!');
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
  });

module.exports = db;

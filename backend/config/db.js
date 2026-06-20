const mysql = require('mysql2');
const dotenv = require('dotenv');
const { getPoolConfig } = require('./dbConfig');

dotenv.config();

const pool = mysql.createPool({
  ...getPoolConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    return;
  }

  console.log('MySQL database connected successfully!');
  connection.release();
});

module.exports = pool;

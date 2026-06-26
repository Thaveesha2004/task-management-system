/**
 * Quick local check: backend DB + DELETE /api/users/:id route.
 * Usage: node scripts/verify-delete-user.js <userId>
 */
const dotenv = require('dotenv');
dotenv.config({ override: true });

const db = require('../config/db');
const userController = require('../controllers/userController');

async function main() {
  const targetId = Number(process.argv[2]);
  if (!targetId) {
    console.error('Usage: node scripts/verify-delete-user.js <userId>');
    process.exit(1);
  }

  await db.connectWithFallback();
  console.log('DB:', db.getActiveConfigLabel());

  const adminId = 1;
  let statusCode = 0;
  let body = null;

  const req = { params: { id: String(targetId) }, user: { id: adminId, role: 'Admin' } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };

  await userController.deleteUser(req, res);

  if (statusCode && statusCode !== 200) {
    console.error('Delete failed:', statusCode, body);
    process.exit(1);
  }

  console.log('Delete OK:', body);

  const [rows] = await db.promise().query('SELECT id FROM users WHERE id = ?', [targetId]);
  if (rows.length) {
    console.error('User still exists in database');
    process.exit(1);
  }

  console.log('Verified: user row removed');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

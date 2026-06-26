const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { sendWelcomeEmail, isEmailConfigured } = require('../utils/sendEmail');
const { createNotification } = require('../services/notificationService');
const { PASSWORD_REGEX, internalError, validationError } = require('../utils/errors');
const generateTempPassword = require('../utils/generateTempPassword');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getRoleId(roleName) {
  const [rows] = await db.promise().query('SELECT id FROM roles WHERE role_name = ?', [roleName]);
  return rows.length > 0 ? rows[0].id : null;
}

async function rollbackNewUser(userId) {
  await db.promise().query('DELETE FROM notifications WHERE user_id = ?', [userId]);
  await db.promise().query('DELETE FROM users WHERE id = ?', [userId]);
}

exports.createUser = async (req, res) => {
  try {
    const full_name = req.body.full_name || req.body.name;
    const { email, role } = req.body;

    if (!full_name || !email || !role) {
      const errors = [];
      if (!full_name) errors.push({ field: 'full_name', message: 'Full name is required' });
      if (!email) errors.push({ field: 'email', message: 'Email is required' });
      if (!role) errors.push({ field: 'role', message: 'Role is required' });
      return validationError(res, errors, 'Full name, email, and role are required');
    }

    if (!isValidEmail(email)) {
      return validationError(res, [{ field: 'email', message: 'Email must be valid' }]);
    }

    const validRoles = ['Admin', 'Project Manager', 'Collaborator'];
    if (!validRoles.includes(role)) {
      return validationError(res, [{ field: 'role', message: 'Invalid role' }]);
    }

    const roleId = await getRoleId(role);
    if (!roleId) {
      return validationError(res, [{ field: 'role', message: 'Role not found in database' }]);
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        errorCode: 'EMAIL_NOT_CONFIGURED',
        message:
          'Email is not configured on the server. Add RESEND_API_KEY and EMAIL_FROM on Render, then redeploy.',
      });
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const [rows] = await db.promise().query(
      `INSERT INTO users (full_name, email, password_hash, role_id, is_first_login, created_at, updated_at)
       VALUES (?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [full_name, email, hashedPassword, roleId]
    );

    const userId = rows[0]?.id;

    try {
      await sendWelcomeEmail(email, full_name, tempPassword);
    } catch (emailErr) {
      console.error('Welcome email error:', emailErr.message);
      await rollbackNewUser(userId);
      return res.status(502).json({
        errorCode: 'EMAIL_SEND_FAILED',
        message: `Could not send welcome email to ${email}. ${emailErr.message}`,
      });
    }

    try {
      await createNotification(
        userId,
        'Welcome to Taskora',
        'Your account was created. Check your email for login details.',
        'admin_update'
      );
    } catch (notifyErr) {
      console.error('User welcome notification error:', notifyErr.message);
    }

    res.status(201).json({
      message: `User created. Welcome email sent to ${email}.`,
      userId,
      emailSent: true,
    });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
      return validationError(res, [{ field: 'email', message: 'Email already exists' }]);
    }
    return internalError(res, err, 'Failed to create user');
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const [results] = await db.promise().query(
      `SELECT u.id, u.full_name AS name, u.email, r.role_name AS role, u.is_active
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.is_active = TRUE
       ORDER BY u.full_name`
    );

    // BE-43: the user directory exposes emails only to Admin/PM. Collaborators
    // still get names + roles (for display), but not contact emails.
    const data =
      req.user.role === 'Collaborator'
        ? results.map(({ email, ...rest }) => rest)
        : results;

    res.json({ success: true, data });
  } catch (err) {
    return internalError(res, err);
  }
};

exports.getUsers = async (req, res) => {
  try {
    const [results] = await db.promise().query(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at, r.role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.id`
    );
    const data = results.map((user) => ({
      ...user,
      name: user.full_name,
      role: user.role_name,
    }));
    res.json({ success: true, data });
  } catch (err) {
    return internalError(res, err);
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const full_name = req.body.full_name || req.body.name;
    const { email, role } = req.body;

    if (!full_name || !email || !role) {
      const errors = [];
      if (!full_name) errors.push({ field: 'full_name', message: 'Full name is required' });
      if (!email) errors.push({ field: 'email', message: 'Email is required' });
      if (!role) errors.push({ field: 'role', message: 'Role is required' });
      return validationError(res, errors, 'Full name, email, and role are required');
    }

    if (!isValidEmail(email)) {
      return validationError(res, [{ field: 'email', message: 'Email must be valid' }]);
    }

    const validRoles = ['Admin', 'Project Manager', 'Collaborator'];
    if (!validRoles.includes(role)) {
      return validationError(res, [{ field: 'role', message: 'Invalid role' }]);
    }

    const roleId = await getRoleId(role);
    if (!roleId) {
      return validationError(res, [{ field: 'role', message: 'Invalid role' }]);
    }

    const [result] = await db.promise().query(
      'UPDATE users SET full_name = ?, email = ?, role_id = ? WHERE id = ?',
      [full_name, email, roleId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    // BE-16: notify the affected user of the administrative change (covers role change).
    try {
      await createNotification(id, 'Account updated', 'Your account was updated by an administrator.', 'admin_update');
    } catch (notifyErr) {
      console.error('admin_update notification failed:', notifyErr.message);
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    return internalError(res, err);
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.promise().query('UPDATE users SET is_active = FALSE WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    // BE-16: emit an admin_update so the change surfaces in real time.
    try {
      await createNotification(id, 'Account deactivated', 'Your account has been deactivated by an administrator.', 'admin_update');
    } catch (notifyErr) {
      console.error('admin_update notification failed:', notifyErr.message);
    }

    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    return internalError(res, err);
  }
};

exports.activateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.promise().query('UPDATE users SET is_active = TRUE WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    // BE-16: emit an admin_update so the reactivation surfaces in real time.
    try {
      await createNotification(id, 'Account reactivated', 'Your account has been reactivated.', 'admin_update');
    } catch (notifyErr) {
      console.error('admin_update notification failed:', notifyErr.message);
    }

    res.json({ message: 'User activated successfully' });
  } catch (err) {
    return internalError(res, err);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const adminId = Number(req.user.id);

    if (!targetId || Number.isNaN(targetId)) {
      return validationError(res, [{ field: 'id', message: 'A valid user id is required' }]);
    }

    if (targetId === adminId) {
      return res.status(400).json({
        errorCode: 'CANNOT_DELETE_SELF',
        message: 'You cannot delete your own account',
      });
    }

    const deletedRows = await db.runTransaction(async (query) => {
      const exists = await query(
        `SELECT u.id, r.role_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [targetId]
      );

      if (!exists.rows.length) {
        return null;
      }

      if (exists.rows[0].role_name === 'Admin') {
        const adminCount = await query(
          `SELECT COUNT(*)::int AS count
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE r.role_name = 'Admin'`
        );

        if (Number(adminCount.rows[0]?.count ?? 0) <= 1) {
          const err = new Error('Cannot delete the only admin account');
          err.code = 'LAST_ADMIN';
          throw err;
        }
      }

      await query('DELETE FROM comments WHERE user_id = ?', [targetId]);
      await query('DELETE FROM attachments WHERE uploaded_by = ?', [targetId]);
      await query('DELETE FROM notifications WHERE user_id = ?', [targetId]);
      await query(
        'UPDATE projects SET created_by = ?, updated_at = CURRENT_TIMESTAMP WHERE created_by = ?',
        [adminId, targetId]
      );
      await query(
        'UPDATE tasks SET created_by = ?, updated_at = CURRENT_TIMESTAMP WHERE created_by = ?',
        [adminId, targetId]
      );

      const deleted = await query('DELETE FROM users WHERE id = ? RETURNING id', [targetId]);
      return deleted.rows;
    });

    if (!deletedRows?.length) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    res.json({ message: 'User deleted permanently', deletedId: deletedRows[0].id });
  } catch (err) {
    if (err.code === 'LAST_ADMIN') {
      return res.status(400).json({
        errorCode: 'LAST_ADMIN',
        message: err.message,
      });
    }
    if (err.code === '23503') {
      return res.status(409).json({
        errorCode: 'DELETE_BLOCKED',
        message: 'User could not be deleted because of linked records',
      });
    }
    console.error('deleteUser failed:', err.message);
    return internalError(res, err, 'Failed to delete user');
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    const user = rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role_name,
        is_active: user.is_active !== false && user.is_active !== 0,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    return internalError(res, err);
  }
};

exports.changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      const errors = [];
      if (!currentPassword) errors.push({ field: 'currentPassword', message: 'Current password is required' });
      if (!newPassword) errors.push({ field: 'newPassword', message: 'New password is required' });
      return validationError(res, errors, 'Current password and new password are required');
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return validationError(res, [
        { field: 'newPassword', message: 'New password must be at least 8 characters and include upper, lower, a number, and a symbol' },
      ]);
    }

    if (currentPassword === newPassword) {
      return validationError(res, [
        { field: 'newPassword', message: 'New password must be different from your current password' },
      ]);
    }

    const [rows] = await db.promise().query(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    const matches = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!matches) {
      return res.status(401).json({
        errorCode: 'INVALID_PASSWORD',
        message: 'Current password is incorrect',
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.promise().query(
      'UPDATE users SET password_hash = ?, is_first_login = FALSE WHERE id = ?',
      [hashed, req.user.id]
    );

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    return internalError(res, err);
  }
};
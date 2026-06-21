const bcrypt = require('bcryptjs');
const db = require('../config/db');
const sendWelcomeEmail = require('../utils/sendEmail');
const { createNotification } = require('../services/notificationService');

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#';
  let password = 'Aa1';
  for (let i = 0; i < 9; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getRoleId(roleName) {
  const [rows] = await db.promise().query('SELECT id FROM roles WHERE role_name = ?', [roleName]);
  return rows.length > 0 ? rows[0].id : null;
}

exports.createUser = async (req, res) => {
  try {
    const { full_name, email, role } = req.body;

    if (!full_name || !email || !role) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Full name, email, and role are required',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Email must be valid',
      });
    }

    const validRoles = ['Admin', 'Project Manager', 'Collaborator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Invalid role',
      });
    }

    const roleId = await getRoleId(role);
    if (!roleId) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Role not found in database',
      });
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const [result] = await db.promise().query(
      'INSERT INTO users (full_name, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
      [full_name, email, hashedPassword, roleId]
    );

    try {
      await createNotification(
        result.insertId,
        'Welcome to TMS',
        'Your account was created. Use your temporary password on first login, then reset it.',
        'admin_update'
      );
    } catch (notifyErr) {
      console.error('User welcome notification error:', notifyErr.message);
    }

    try {
      await sendWelcomeEmail(email, full_name, tempPassword);
    } catch (emailErr) {
      console.error('Welcome email error:', emailErr.message);
    }

    res.status(201).json({
      message: 'User created successfully',
      userId: result.insertId,
      tempPassword,
    });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Email already exists' });
    }
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
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
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
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
    res.json(results);
  } catch (err) {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role } = req.body;

    if (!full_name || !email || !role) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Full name, email, and role are required',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Email must be valid',
      });
    }

    const roleId = await getRoleId(role);
    if (!roleId) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Invalid role',
      });
    }

    const [result] = await db.promise().query(
      'UPDATE users SET full_name = ?, email = ?, role_id = ? WHERE id = ?',
      [full_name, email, roleId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.promise().query('UPDATE users SET is_active = FALSE WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
  }
};

exports.activateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.promise().query('UPDATE users SET is_active = TRUE WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    res.json({ message: 'User activated successfully' });
  } catch (err) {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
  }
};
const { Resend } = require('resend');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

function getFrontendUrl() {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  const origin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
  return origin.replace(/\/$/, '');
}

function isEmailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
    process.env.EMAIL_FROM?.trim()
  );
}

function getFromAddress() {
  return process.env.EMAIL_FROM.trim();
}

async function sendWelcomeEmail(toEmail, fullName, temporaryPassword) {
  const client = getClient();

  if (!isEmailConfigured() || !client) {
    throw new Error('Resend not configured. Set RESEND_API_KEY and EMAIL_FROM on the server.');
  }

  const loginUrl = `${getFrontendUrl()}/login`;
  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(toEmail);
  const safePassword = escapeHtml(temporaryPassword);

  const { data, error } = await client.emails.send({
    from: getFromAddress(),
    to: [toEmail.trim()],
    subject: 'Welcome to Taskora — your account details',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Welcome to Taskora</h2>
        <p>Hi ${safeName},</p>
        <p>Your administrator created an account for you.</p>
        <div style="background: #f4f6fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin: 0;"><strong>Temporary password:</strong> ${safePassword}</p>
        </div>
        <p><a href="${loginUrl}" style="background:#1a2230;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;">Sign in to Taskora</a></p>
        <p style="color:#666;font-size:14px;">You must change your password on first login.</p>
      </div>
    `,
    text: [
      `Welcome to Taskora, ${fullName}!`,
      `Email: ${toEmail}`,
      `Temporary password: ${temporaryPassword}`,
      `Sign in: ${loginUrl}`,
      'You must change your password on first login.',
    ].join('\n'),
  });

  if (error) {
    throw new Error(error.message || 'Failed to send welcome email');
  }

  return data;
}

async function sendForgotPasswordEmail(toEmail, fullName, temporaryPassword) {
  const client = getClient();

  if (!isEmailConfigured() || !client) {
    throw new Error('Resend not configured. Set RESEND_API_KEY and EMAIL_FROM on the server.');
  }

  const loginUrl = `${getFrontendUrl()}/login`;
  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(toEmail);
  const safePassword = escapeHtml(temporaryPassword);

  const { data, error } = await client.emails.send({
    from: getFromAddress(),
    to: [toEmail.trim()],
    subject: 'Taskora — your temporary password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Password reset request</h2>
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your Taskora password. Use the temporary password below to sign in.</p>
        <div style="background: #f4f6fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin: 0;"><strong>Temporary password:</strong> ${safePassword}</p>
        </div>
        <p><a href="${loginUrl}" style="background:#1a2230;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;">Sign in to Taskora</a></p>
        <p style="color:#666;font-size:14px;">After signing in, you will be asked to choose a new password.</p>
        <p style="color:#666;font-size:14px;">If you did not request this, contact your administrator.</p>
      </div>
    `,
    text: [
      `Hi ${fullName},`,
      'We received a request to reset your Taskora password.',
      `Email: ${toEmail}`,
      `Temporary password: ${temporaryPassword}`,
      `Sign in: ${loginUrl}`,
      'After signing in, you will be asked to choose a new password.',
      'If you did not request this, contact your administrator.',
    ].join('\n'),
  });

  if (error) {
    throw new Error(error.message || 'Failed to send password reset email');
  }

  return data;
}

module.exports = sendWelcomeEmail;
module.exports.isEmailConfigured = isEmailConfigured;
module.exports.sendWelcomeEmail = sendWelcomeEmail;
module.exports.sendForgotPasswordEmail = sendForgotPasswordEmail;

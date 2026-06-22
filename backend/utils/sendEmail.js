const { Resend } = require('resend');

function getClient() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

function getFrontendUrl() {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  const origin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
  return origin.replace(/\/$/, '');
}

function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

async function sendWelcomeEmail(toEmail, fullName, temporaryPassword) {
  const client = getClient();

  if (!isEmailConfigured() || !client) {
    throw new Error('Resend not configured. Set RESEND_API_KEY and EMAIL_FROM on the server.');
  }

  const loginUrl = `${getFrontendUrl()}/login`;

  const { error } = await client.emails.send({
    from: process.env.EMAIL_FROM,
    to: [toEmail],
    subject: 'Welcome to Taskora — your account details',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Welcome to Taskora</h2>
        <p>Hi ${fullName},</p>
        <p>Your administrator created an account for you.</p>
        <div style="background: #f4f6fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><strong>Email:</strong> ${toEmail}</p>
          <p style="margin: 0;"><strong>Temporary password:</strong> ${temporaryPassword}</p>
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
}

module.exports = sendWelcomeEmail;
module.exports.isEmailConfigured = isEmailConfigured;
module.exports.sendWelcomeEmail = sendWelcomeEmail;

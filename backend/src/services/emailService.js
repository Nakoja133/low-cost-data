const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const sendEmail = async ({ to, subject, text, html }) => {
  if (!resend) {
    console.log('⚠️ Email not configured — skipping:', subject);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from:    process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to,
      subject,
      text,
      html: html || text,
    });

    if (error) {
      console.error('❌ Email error:', error);
      return { success: false, error };
    }

    console.log('✅ Email sent:', subject);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Email failed:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = sendEmail;
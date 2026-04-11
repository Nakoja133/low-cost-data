const nodemailer = require('nodemailer');

const emailHost = process.env.EMAIL_HOST;
const emailPort = parseInt(process.env.EMAIL_PORT, 10) || 587;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const emailConfigured = Boolean(emailHost && emailUser && emailPass);

// Create transporter only when SMTP credentials are available
const transporter = emailConfigured
  ? nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })
  : null;

// Verify connection on startup
if (transporter) {
  transporter.verify((error) => {
    if (error) {
      console.error('Email service connection failed:', error.message);
      console.log('Check your .env email settings');
    } else {
      console.log('Email service ready - can send emails');
    }
  });
} else {
  console.log('Email service not configured. Skipping SMTP verification.');
}

// Send email function
const sendEmail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    console.error('Email send failed: email service is not configured');
    return { success: false, error: 'Email service is not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Low-Cost Data Bundles" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      text,
      html,
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = sendEmail;

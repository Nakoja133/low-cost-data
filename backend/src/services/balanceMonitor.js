const axios = require('axios');
const pool = require('../config/database');
const nodemailer = require('nodemailer'); // For email

// Check XRAYGH balance (if API endpoint exists)
// If not, we'll calculate locally based on orders
exports.checkXrayghBalance = async () => {
  try {
    // OPTION 1: If XRAYGH has a balance endpoint
    const response = await axios.get('https://de-xraygh.com/api_balance', {
      headers: {
        'Authorization': `Bearer ${process.env.XRAYGH_API_KEY}`,
      },
    });
    return parseFloat(response.data.balance);
    
  } catch (err) {
    // OPTION 2: Fallback - Calculate local estimated balance
    // (Starting balance - sum of all completed orders' base_cost)
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(dp.base_cost), 0) as total_spent
      FROM orders o
      JOIN data_packages dp ON o.package_id = dp.id
      WHERE o.status = 'completed'
    `);
    
    const startingBalance = 100.00; // Admin sets this manually
    return startingBalance - parseFloat(result.rows[0].total_spent);
  }
};

// Send alert to admin
exports.sendLowBalanceAlert = async (currentBalance, threshold) => {
  const admin = await pool.query('SELECT email, phone FROM users WHERE role = \'admin\' LIMIT 1');
  const adminUser = admin.rows[0];
  
  // 1. Email Alert
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: adminUser.email,
    subject: '⚠️ Low XRAYGH Balance Alert',
    text: `Your XRAYGH balance (GH₵${currentBalance}) is below threshold (GH₵${threshold}). Please top up to avoid service interruption.`,
  });
  
  // 2. SMS Alert (using Twilio or similar)
  // await sendSMS(adminUser.phone, `Low balance alert: GH₵${currentBalance} < GH₵${threshold}`);
  
  // 3. Log the alert
  await pool.query(
    'INSERT INTO alerts (type, message, severity) VALUES ($1, $2, $3)',
    ['low_balance', `Balance GH₵${currentBalance} below threshold GH₵${threshold}`, 'high']
  );
  
  console.log(`🚨 Low balance alert sent to admin: ${adminUser.email}`);
};
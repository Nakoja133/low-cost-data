const cron = require('node-cron');
const { checkXrayghBalance, sendLowBalanceAlert } = require('../services/balanceMonitor');

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('🔄 Running XRAYGH balance check...');
  
  try {
    // Get threshold from settings
    const settings = await pool.query(
      'SELECT setting_value FROM admin_settings WHERE setting_key = \'xraygh_balance_threshold\''
    );
    const threshold = parseFloat(settings.rows[0]?.setting_value || '20.00');
    
    // Check actual balance
    const currentBalance = await checkXrayghBalance();
    console.log(`💰 Current XRAYGH balance: GH₵${currentBalance}`);
    
    // Alert if low
    if (currentBalance < threshold) {
      await sendLowBalanceAlert(currentBalance, threshold);
    }
  } catch (err) {
    console.error('❌ Balance check failed:', err.message);
  }
});
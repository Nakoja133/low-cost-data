require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const pool    = require('./src/config/database');
const app     = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes        = require('./src/routes/authRoutes');
const agentRoutes       = require('./src/routes/agentRoutes');
const adminRoutes       = require('./src/routes/adminRoutes');
const orderRoutes       = require('./src/routes/orderRoutes');
const webhookRoutes     = require('./src/routes/webhookRoutes');
const storeRoutes       = require('./src/routes/storeRoutes');
const packageRoutes     = require('./src/routes/packageRoutes');
const agentPricesRoutes = require('./src/routes/agentPricesRoutes');
const withdrawalRoutes  = require('./src/routes/withdrawalRoutes');
const lockActivitiesRoutes = require('./src/routes/lockActivitiesRoutes');

// ✅ specific sub-paths BEFORE broad paths
app.use('/api/auth',         authRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/agent/prices', agentPricesRoutes);
app.use('/api/agent',        agentRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/webhook',      webhookRoutes);
app.use('/api/store',        storeRoutes);
app.use('/api/packages',     packageRoutes);
app.use('/api/withdrawals',  withdrawalRoutes);
app.use('/api/lock-activities', lockActivitiesRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'OK' }));
app.get('/', (_, res) => res.json({ message: 'Low-Cost Data Bundles API v1.0.0' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🌍 Server running on http://localhost:${PORT}`);
  try { await pool.query('SELECT NOW()'); console.log('✅ PostgreSQL connected'); }
  catch (err) { console.error('❌ DB error:', err.message); }
});

// Start cron jobs
require('./src/jobs/balanceCheck');
require('./src/jobs/inactiveAgentSuspension');
console.log('✅ Balance monitor started');
console.log('✅ Inactive agent suspension job started');

module.exports = app;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./src/config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const agentRoutes = require('./src/routes/agentRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');
const storeRoutes = require('./src/routes/storeRoutes');
const packageRoutes = require('./src/routes/packageRoutes');
const agentPricesRoutes = require('./src/routes/agentPricesRoutes');
const withdrawalRoutes = require('./src/routes/withdrawalRoutes');

// Register routes
app.use('/api/auth', authRoutes);           // POST /api/auth/login
app.use('/api/agent', agentRoutes);         // GET /api/agent/wallet, etc.
app.use('/api/admin', adminRoutes);         // GET /api/admin/users, etc.
app.use('/api/orders', orderRoutes);        // POST /api/orders, etc.
app.use('/api/webhook', webhookRoutes);     // POST /api/webhook/paystack
app.use('/api/store', storeRoutes);         // GET /api/store/:slug
app.use('/api/packages', packageRoutes);    // GET /api/packages
app.use('/api/agent/prices', agentPricesRoutes); // GET /api/agent/prices
app.use('/api/withdrawals', withdrawalRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Low-Cost Data Bundles API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      agent: '/api/agent',
      admin: '/api/admin',
      orders: '/api/orders',
      webhook: '/api/webhook',
      store: '/api/store',
      packages: '/api/packages',
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🌍 Server running on http://localhost:${PORT}`);
  
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
});

module.exports = app;
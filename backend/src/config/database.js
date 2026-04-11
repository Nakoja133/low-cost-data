const { Pool } = require('pg');
require('dotenv').config();

const envFlag = (value, defaultValue = false) => {
  if (value == null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on', 'require'].includes(String(value).toLowerCase());
};

const hasConnectionString = Boolean(process.env.DATABASE_URL);
const useSSL = envFlag(
  process.env.DB_SSL,
  hasConnectionString || process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER)
);

const poolConfig = hasConnectionString
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    };

if (useSSL) {
  poolConfig.ssl = {
    rejectUnauthorized: envFlag(process.env.DB_SSL_REJECT_UNAUTHORIZED, false),
  };
}

const pool = new Pool(poolConfig);

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Database connection error', err.stack);
  }
  console.log('✅ Connected to PostgreSQL');
  release();
});

module.exports = pool;

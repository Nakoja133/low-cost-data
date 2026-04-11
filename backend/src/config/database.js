const { Pool } = require('pg');
require('dotenv').config();

const envFlag = (value, defaultValue = false) => {
  if (value == null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on', 'require'].includes(String(value).toLowerCase());
};

const getHostFromConnectionString = (connectionString) => {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return '';
  }
};

const hasConnectionString = Boolean(process.env.DATABASE_URL);
const dbHost = hasConnectionString
  ? getHostFromConnectionString(process.env.DATABASE_URL)
  : (process.env.DB_HOST || '');
const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(dbHost.toLowerCase());
const useSSL = envFlag(
  process.env.DB_SSL,
  hasConnectionString || (dbHost && !isLocalDatabase) || process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER)
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

console.log(`Database SSL ${useSSL ? 'enabled' : 'disabled'}${dbHost ? ` for host ${dbHost}` : ''}`);

const pool = new Pool(poolConfig);

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Database connection error', err.stack);
  }
  console.log('Connected to PostgreSQL');
  release();
});

module.exports = pool;

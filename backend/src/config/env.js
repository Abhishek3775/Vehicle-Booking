const dotenv = require('dotenv');
const path = require('path');

// Load .env file from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnvVars = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

// Check database URI: allow either MONGO_URI or MONGODB_URI
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error(
    'Startup configuration error: Missing required environment variable MONGO_URI or MONGODB_URI in .env file.'
  );
}

// Validate other required environment variables
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(
      `Startup configuration error: Missing required environment variable "${varName}" in .env file.`
    );
  }
}

const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: mongoUri,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
  OTP_RESEND_COOLDOWN_SECONDS: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10),
  OTP_MAX_REQUESTS: parseInt(process.env.OTP_MAX_REQUESTS || '5', 10),
  OTP_WINDOW_MINUTES: parseInt(process.env.OTP_WINDOW_MINUTES || '10', 10),
};

module.exports = env;

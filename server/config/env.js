const path = require('node:path')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true })

const nodeEnv = process.env.NODE_ENV || 'development'
const jwtSecret = process.env.JWT_SECRET
const mongodbUri =
  process.env.MONGODB_URI ||
  (nodeEnv === 'production' ? '' : 'mongodb://127.0.0.1:27017/cloudcraft')

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set to a random string of at least 32 characters.')
}

if (!mongodbUri) {
  throw new Error('MONGODB_URI must be set in production.')
}

const port = Number(process.env.PORT) || 5000

const env = {
  nodeEnv,
  port,
  clientOrigin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, ''),
  siteUrl: (
    process.env.PUBLIC_SITE_URL ||
    process.env.CLIENT_ORIGIN ||
    'http://localhost:5173'
  ).replace(/\/$/, ''),
  publicApiUrl: (process.env.PUBLIC_API_URL || `http://localhost:${port}`).replace(/\/$/, ''),
  mongodbUri,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: process.env.COOKIE_NAME || 'cloudcraft_token',
  cookieSecure:
    process.env.COOKIE_SECURE === undefined
      ? nodeEnv === 'production'
      : process.env.COOKIE_SECURE === 'true',
  cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  uploadDir: process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(__dirname, '../uploads'),
  uploadMaxBytes: 5 * 1024 * 1024,
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
}

module.exports = env

const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const morgan = require('morgan')
const env = require('./config/env')
const authRoutes = require('./routes/authRoutes')
const postRoutes = require('./routes/postRoutes')
const userRoutes = require('./routes/userRoutes')
const uploadRoutes = require('./routes/uploadRoutes')
const newsletterRoutes = require('./routes/newsletterRoutes')
const analyticsRoutes = require('./routes/analyticsRoutes')
const aiRoutes = require('./routes/aiRoutes')
const externalRoutes = require('./routes/externalRoutes')
const seoRoutes = require('./routes/seoRoutes')
const { uploadsPath } = require('./middleware/upload')
const { notFound, errorHandler } = require('./middleware/errorMiddleware')

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', env.nodeEnv === 'production' ? 1 : false)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'))
}

app.use('/uploads', express.static(uploadsPath, { maxAge: '7d', index: false }))

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'cloudcraft-api',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/users', userRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/newsletter', newsletterRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/external', externalRoutes)
app.use(seoRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app

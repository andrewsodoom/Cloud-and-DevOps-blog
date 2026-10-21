const express = require('express')
const rateLimit = require('express-rate-limit')
const authenticate = require('../middleware/authenticate')
const { requireRole } = require('../middleware/authorize')
const { suggestContent } = require('../controllers/aiController')

const router = express.Router()

const suggestionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many suggestion requests. Try again in a few minutes.' },
})

router.post(
  '/suggestions',
  authenticate,
  requireRole('author', 'admin'),
  suggestionLimiter,
  suggestContent,
)

module.exports = router

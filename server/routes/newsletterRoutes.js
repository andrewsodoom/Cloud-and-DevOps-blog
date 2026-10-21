const express = require('express')
const rateLimit = require('express-rate-limit')
const authenticate = require('../middleware/authenticate')
const { requireRole } = require('../middleware/authorize')
const { subscribe, listSubscribers } = require('../controllers/newsletterController')

const router = express.Router()

const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many subscription attempts. Try again in a few minutes.' },
})

router.post('/', subscribeLimiter, subscribe)
router.get('/', authenticate, requireRole('admin'), listSubscribers)

module.exports = router

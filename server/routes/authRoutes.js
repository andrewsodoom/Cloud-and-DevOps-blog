const express = require('express')
const rateLimit = require('express-rate-limit')
const authenticate = require('../middleware/authenticate')
const { register, login, logout, me } = require('../controllers/authController')

const router = express.Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Try again in a few minutes.' },
})

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.post('/logout', logout)
router.get('/me', authenticate, me)

module.exports = router

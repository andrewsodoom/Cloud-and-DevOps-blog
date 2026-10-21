const express = require('express')
const rateLimit = require('express-rate-limit')
const {
  listExternalArticles,
  getExternalArticleDetail,
} = require('../controllers/externalController')

const router = express.Router()

const externalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many feed requests. Try again in a few minutes.' },
})

router.get('/', externalLimiter, listExternalArticles)
router.get('/:id', externalLimiter, getExternalArticleDetail)

module.exports = router

const express = require('express')
const authenticate = require('../middleware/authenticate')
const { requireRole } = require('../middleware/authorize')
const { getOverview } = require('../controllers/analyticsController')

const router = express.Router()

router.get('/overview', authenticate, requireRole('admin'), getOverview)

module.exports = router

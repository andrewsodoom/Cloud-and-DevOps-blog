const express = require('express')
const authenticate = require('../middleware/authenticate')
const { requireRole } = require('../middleware/authorize')
const {
  listUsers,
  listAuthors,
  getUser,
  updateMe,
  becomeAuthor,
  updateUserRole,
} = require('../controllers/userController')

const router = express.Router()

router.get('/', authenticate, requireRole('admin'), listUsers)
router.get('/authors', listAuthors)
router.patch('/me', authenticate, updateMe)
router.post('/me/become-author', authenticate, becomeAuthor)
router.get('/:id', getUser)
router.patch('/:id/role', authenticate, requireRole('admin'), updateUserRole)

module.exports = router

const express = require('express')
const authenticate = require('../middleware/authenticate')
const { optionalAuthenticate, requireRole } = require('../middleware/authorize')
const {
  listPosts,
  listTrendingPosts,
  listBookmarkedPosts,
  listMyPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleBookmark,
} = require('../controllers/postController')
const {
  listComments,
  createComment,
  deleteComment,
} = require('../controllers/commentController')

const router = express.Router()

router.get('/', optionalAuthenticate, listPosts)
router.get('/trending', optionalAuthenticate, listTrendingPosts)
router.get('/bookmarks', authenticate, listBookmarkedPosts)
router.get('/mine', authenticate, listMyPosts)
router.post('/', authenticate, requireRole('author', 'admin'), createPost)
router.get('/:slug', optionalAuthenticate, getPost)
router.patch('/:id', authenticate, updatePost)
router.delete('/:id', authenticate, deletePost)
router.post('/:id/like', authenticate, toggleLike)
router.post('/:id/bookmark', authenticate, toggleBookmark)
router.get('/:id/comments', optionalAuthenticate, listComments)
router.post('/:id/comments', authenticate, createComment)
router.delete('/:id/comments/:commentId', authenticate, deleteComment)

module.exports = router

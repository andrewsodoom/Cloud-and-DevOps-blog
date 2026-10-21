const mongoose = require('mongoose')
const Post = require('../models/Post')
const Comment = require('../models/Comment')
const { validateComment } = require('../utils/validation')
const { parsePagination, paginationMeta } = require('../utils/pagination')
const { canViewPost, sameId } = require('../utils/postAccess')

function authorSummary(author) {
  if (!author) return { id: null, name: null, role: null }
  if (author.name === undefined) return { id: String(author), name: null, role: null }

  return {
    id: String(author._id || author.id),
    name: author.name,
    role: author.role,
  }
}

function toComment(comment) {
  return {
    id: String(comment._id),
    body: comment.body,
    author: authorSummary(comment.author),
    post: String(comment.post),
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  }
}

async function findPost(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ message: 'Post not found.' })
    return null
  }

  const post = await Post.findById(req.params.id)

  if (!post || !canViewPost(post, req.user)) {
    res.status(404).json({ message: 'Post not found.' })
    return null
  }

  return post
}

async function listComments(req, res) {
  const post = await findPost(req, res)

  if (!post) return

  const { page, limit, skip } = parsePagination(req.query, 20)

  const [total, comments] = await Promise.all([
    Comment.countDocuments({ post: post._id }),
    Comment.find({ post: post._id })
      .populate('author', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ])

  return res.json({
    comments: comments.map(toComment),
    pagination: paginationMeta(page, limit, total),
  })
}

async function createComment(req, res) {
  const post = await findPost(req, res)

  if (!post) return

  if (post.status !== 'published') {
    return res.status(400).json({ message: 'Only published posts can be commented on.' })
  }

  const { data, errors } = validateComment(req.body)

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      message: 'Please check the highlighted fields.',
      errors,
    })
  }

  const comment = await Comment.create({
    post: post._id,
    author: req.user._id,
    body: data.body,
  })

  post.commentCount += 1
  await post.save()

  await comment.populate('author', 'name role')

  return res.status(201).json({
    message: 'Comment added.',
    comment: toComment(comment),
  })
}

async function deleteComment(req, res) {
  if (
    !mongoose.isValidObjectId(req.params.id) ||
    !mongoose.isValidObjectId(req.params.commentId)
  ) {
    return res.status(404).json({ message: 'Comment not found.' })
  }

  const comment = await Comment.findOne({
    _id: req.params.commentId,
    post: req.params.id,
  })

  if (!comment) {
    return res.status(404).json({ message: 'Comment not found.' })
  }

  const post = await Post.findById(comment.post)
  const isCommentAuthor = sameId(comment.author, req.user)
  const isPostAuthor = post && sameId(post.author, req.user)

  if (!isCommentAuthor && !isPostAuthor && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You cannot delete this comment.' })
  }

  await comment.deleteOne()

  if (post) {
    post.commentCount = Math.max(0, post.commentCount - 1)
    await post.save()
  }

  return res.json({ message: 'Comment deleted.' })
}

module.exports = { listComments, createComment, deleteComment }

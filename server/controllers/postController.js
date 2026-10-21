const mongoose = require('mongoose')
const Post = require('../models/Post')
const Comment = require('../models/Comment')
const User = require('../models/User')
const { validatePost, normalizeTags } = require('../utils/validation')
const { slugify } = require('../utils/slug')
const { calculateReadingTime } = require('../utils/post')
const { htmlToText, sanitizePostContent } = require('../utils/content')
const { parsePagination, paginationMeta } = require('../utils/pagination')
const { canViewPost, canManagePost } = require('../utils/postAccess')

const SEARCH_MAX_LENGTH = 100
const TRENDING_WINDOW = 100

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function postId(post) {
  return String(post._id)
}

function authorSummary(author) {
  if (!author) return null
  if (author.name === undefined) return { id: String(author), name: null, role: null }

  return {
    id: String(author._id || author.id),
    name: author.name,
    role: author.role,
  }
}

function bookmarkSet(viewer) {
  return new Set((viewer?.bookmarks || []).map((id) => String(id)))
}

function toPostSummary(post, viewer, bookmarked = bookmarkSet(viewer)) {
  const likes = post.likes || []

  return {
    id: postId(post),
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags || [],
    coverImage: post.coverImage || '',
    status: post.status,
    author: authorSummary(post.author),
    readingTime: post.readingTime,
    views: post.views || 0,
    likesCount: likes.length,
    likedByMe: Boolean(
      viewer && likes.some((like) => String(like) === String(viewer._id)),
    ),
    bookmarkedByMe: bookmarked.has(postId(post)),
    commentCount: post.commentCount,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }
}

function toPostDetail(post, viewer) {
  return {
    ...toPostSummary(post, viewer),
    content: sanitizePostContent(post.content),
  }
}

async function makeUniqueSlug(base, excludeId = null) {
  const baseSlug = slugify(base)
  const filter = excludeId ? { _id: { $ne: excludeId } } : {}
  let slug = baseSlug
  let suffix = 1

  while (await Post.exists({ ...filter, slug })) {
    suffix += 1
    slug = `${baseSlug}-${suffix}`
  }

  return slug
}

async function listPosts(req, res) {
  const { page, limit, skip } = parsePagination(req.query)
  const filter = { status: 'published' }
  const category = normalizeText(req.query.category)
  const search = normalizeText(req.query.search).slice(0, SEARCH_MAX_LENGTH)
  const author = normalizeText(req.query.author)
  const requestedTag = normalizeText(req.query.tag)
  const tag = requestedTag ? normalizeTags([requestedTag])[0] : ''

  if (requestedTag && !tag) {
    return res.status(422).json({ message: 'Invalid tag.' })
  }

  if (category) {
    filter.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' }
  }

  if (author) {
    if (!mongoose.isValidObjectId(author)) {
      return res.status(422).json({ message: 'Invalid author id.' })
    }

    filter.author = author
  }

  if (tag) {
    filter.tags = tag
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i')
    filter.$or = [
      { title: pattern },
      { excerpt: pattern },
      { tags: pattern },
    ]
  }

  const [total, posts] = await Promise.all([
    Post.countDocuments(filter),
    Post.find(filter)
      .populate('author', 'name role')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ])

  return res.json({
    posts: posts.map((post) => toPostSummary(post, req.user)),
    pagination: paginationMeta(page, limit, total),
  })
}

async function listTrendingPosts(req, res) {
  const requestedLimit = Number(req.query.limit)
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(8, Math.max(1, Math.trunc(requestedLimit)))
    : 5

  const posts = await Post.find({ status: 'published' })
    .populate('author', 'name role')
    .sort({ publishedAt: -1 })
    .limit(TRENDING_WINDOW)
    .lean()

  const ranked = posts
    .map((post) => ({
      post,
      score:
        (post.views || 0) +
        (post.likes || []).length * 4 +
        (post.commentCount || 0) * 6,
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score

      return new Date(right.post.publishedAt) - new Date(left.post.publishedAt)
    })
    .slice(0, limit)

  return res.json({
    posts: ranked.map(({ post }, index) => ({
      ...toPostSummary(post, req.user),
      trendRank: index + 1,
    })),
  })
}

async function listBookmarkedPosts(req, res) {
  const bookmarkIds = (req.user.bookmarks || []).map((id) => String(id))

  if (bookmarkIds.length === 0) {
    return res.json({ posts: [] })
  }

  const posts = await Post.find({
    _id: { $in: bookmarkIds },
    status: 'published',
  })
    .populate('author', 'name role')
    .sort({ publishedAt: -1 })
    .lean()
  const bookmarked = bookmarkSet(req.user)

  return res.json({
    posts: posts.map((post) => toPostSummary(post, req.user, bookmarked)),
  })
}

async function listMyPosts(req, res) {
  const { page, limit, skip } = parsePagination(req.query)
  const filter = {}
  const status = normalizeText(req.query.status)

  if (status === 'draft' || status === 'published') {
    filter.status = status
  }

  if (req.user.role === 'admin' && normalizeText(req.query.author)) {
    if (!mongoose.isValidObjectId(req.query.author)) {
      return res.status(422).json({ message: 'Invalid author id.' })
    }

    filter.author = req.query.author
  } else {
    filter.author = req.user._id
  }

  const [total, posts] = await Promise.all([
    Post.countDocuments(filter),
    Post.find(filter)
      .populate('author', 'name role')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ])

  return res.json({
    posts: posts.map((post) => toPostSummary(post, req.user)),
    pagination: paginationMeta(page, limit, total),
  })
}

async function getPost(req, res) {
  const post = await Post.findOne({ slug: normalizeText(req.params.slug).toLowerCase() })
    .populate('author', 'name role')

  if (!post || !canViewPost(post, req.user)) {
    return res.status(404).json({ message: 'Post not found.' })
  }

  if (post.status === 'published') {
    await Post.updateOne({ _id: post._id }, { $inc: { views: 1 } })
    post.views = (post.views || 0) + 1
  }

  return res.json({ post: toPostDetail(post, req.user) })
}

async function createPost(req, res) {
  const { data, errors } = validatePost(req.body)

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      message: 'Please check the highlighted fields.',
      errors,
    })
  }

  const slug = await makeUniqueSlug(data.slug || data.title)
  const status = data.status || 'draft'
  const excerpt = data.excerpt || htmlToText(data.content).slice(0, 220)

  try {
    const post = await Post.create({
      ...data,
      excerpt,
      slug,
      status,
      author: req.user._id,
      readingTime: calculateReadingTime(data.content),
      publishedAt: status === 'published' ? new Date() : null,
    })

    await post.populate('author', 'name role')

    return res.status(201).json({
      message: status === 'published' ? 'Post published.' : 'Draft saved.',
      post: toPostDetail(post, req.user),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'That slug is already in use.' })
    }

    throw error
  }
}

async function updatePost(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Post not found.' })
  }

  const post = await Post.findById(req.params.id)

  if (!post) {
    return res.status(404).json({ message: 'Post not found.' })
  }

  if (!canManagePost(post, req.user)) {
    return res.status(403).json({ message: 'You can only edit your own posts.' })
  }

  const { data, errors } = validatePost(req.body, { partial: true })

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      message: 'Please check the highlighted fields.',
      errors,
    })
  }

  const updates = {}

  for (const field of [
    'title',
    'excerpt',
    'content',
    'category',
    'tags',
    'coverImage',
    'status',
  ]) {
    if (data[field] !== undefined) {
      updates[field] = data[field]
    }
  }

  if (data.slug && data.slug !== post.slug) {
    updates.slug = await makeUniqueSlug(data.slug, post._id)
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No valid changes were provided.' })
  }

  const nextContent = updates.content !== undefined ? updates.content : post.content
  const nextStatus = updates.status || post.status

  if (nextStatus === 'published' && !htmlToText(nextContent)) {
    return res.status(422).json({
      message: 'Please check the highlighted fields.',
      errors: { content: 'Content is required before publishing.' },
    })
  }

  Object.assign(post, updates)

  if (updates.content !== undefined) {
    post.readingTime = calculateReadingTime(updates.content)
  }

  if (nextStatus === 'published' && !post.publishedAt) {
    post.publishedAt = new Date()
  }

  try {
    await post.save()
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'That slug is already in use.' })
    }

    throw error
  }

  await post.populate('author', 'name role')

  return res.json({
    message: 'Post updated.',
    post: toPostDetail(post, req.user),
  })
}

async function deletePost(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Post not found.' })
  }

  const post = await Post.findById(req.params.id)

  if (!post) {
    return res.status(404).json({ message: 'Post not found.' })
  }

  if (!canManagePost(post, req.user)) {
    return res.status(403).json({ message: 'You can only delete your own posts.' })
  }

  await Promise.all([
    Comment.deleteMany({ post: post._id }),
    User.updateMany({ bookmarks: post._id }, { $pull: { bookmarks: post._id } }),
    post.deleteOne(),
  ])

  return res.json({ message: 'Post deleted.' })
}

async function toggleLike(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Post not found.' })
  }

  const post = await Post.findById(req.params.id)

  if (!post || !canViewPost(post, req.user)) {
    return res.status(404).json({ message: 'Post not found.' })
  }

  if (post.status !== 'published') {
    return res.status(400).json({ message: 'Only published posts can be liked.' })
  }

  const index = post.likes.findIndex((like) => String(like) === String(req.user._id))

  if (index >= 0) {
    post.likes.splice(index, 1)
  } else {
    post.likes.push(req.user._id)
  }

  await post.save()

  return res.json({
    message: index >= 0 ? 'Like removed.' : 'Post liked.',
    liked: index < 0,
    likesCount: post.likes.length,
  })
}

async function toggleBookmark(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Post not found.' })
  }

  const post = await Post.findById(req.params.id)

  if (!post || !canViewPost(post, req.user)) {
    return res.status(404).json({ message: 'Post not found.' })
  }

  if (post.status !== 'published') {
    return res.status(400).json({ message: 'Only published posts can be bookmarked.' })
  }

  const index = req.user.bookmarks.findIndex(
    (bookmark) => String(bookmark) === String(post._id),
  )

  if (index >= 0) {
    req.user.bookmarks.splice(index, 1)
  } else {
    req.user.bookmarks.push(post._id)
  }

  await req.user.save()

  return res.json({
    message: index >= 0 ? 'Bookmark removed.' : 'Post saved to your bookmarks.',
    bookmarked: index < 0,
    bookmarksCount: req.user.bookmarks.length,
  })
}

module.exports = {
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
}

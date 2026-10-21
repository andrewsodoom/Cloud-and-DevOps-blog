const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const {
  validateProfileUpdate,
  validateRoleUpdate,
} = require('../utils/validation')
const { parsePagination, paginationMeta } = require('../utils/pagination')

const SEARCH_MAX_LENGTH = 100

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

async function listUsers(req, res) {
  const { page, limit, skip } = parsePagination(req.query, 20)
  const filter = {}
  const role = normalizeText(req.query.role)
  const search = normalizeText(req.query.search).slice(0, SEARCH_MAX_LENGTH)

  if (['reader', 'author', 'admin'].includes(role)) {
    filter.role = role
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ name: pattern }, { email: pattern }]
  }

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ])

  return res.json({
    users: users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })),
    pagination: paginationMeta(page, limit, total),
  })
}

async function listAuthors(req, res) {
  const authors = await User.find({ role: { $in: ['author', 'admin'] } })
    .select('name role createdAt')
    .sort({ name: 1 })
    .limit(100)
    .lean()

  return res.json({
    authors: authors.map((author) => ({
      id: String(author._id),
      name: author.name,
      role: author.role,
      createdAt: author.createdAt,
    })),
  })
}

async function getUser(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'User not found.' })
  }

  const user = await User.findById(req.params.id).select('name role createdAt').lean()

  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  return res.json({
    user: {
      id: String(user._id),
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
  })
}

async function updateMe(req, res) {
  const { data, errors } = validateProfileUpdate(req.body)

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      message: 'Please check the highlighted fields.',
      errors,
    })
  }

  if (!data.name && !data.email && !data.password) {
    return res.status(400).json({ message: 'Provide a name, email, or password to update.' })
  }

  const account = await User.findById(req.user._id).select('+passwordHash')

  if (!account) {
    return res.status(404).json({ message: 'User not found.' })
  }

  if (data.email && data.email !== account.email) {
    const taken = await User.exists({ email: data.email, _id: { $ne: account._id } })

    if (taken) {
      return res.status(409).json({
        message: 'An account with that email already exists.',
        errors: { email: 'Email is already registered.' },
      })
    }
  }

  if (data.password) {
    const matches = await bcrypt.compare(data.currentPassword, account.passwordHash)

    if (!matches) {
      return res.status(401).json({
        message: 'Current password is incorrect.',
        errors: { currentPassword: 'Current password is incorrect.' },
      })
    }

    account.passwordHash = await bcrypt.hash(data.password, 12)
  }

  if (data.name) account.name = data.name
  if (data.email) account.email = data.email

  try {
    await account.save()
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with that email already exists.',
        errors: { email: 'Email is already registered.' },
      })
    }

    throw error
  }

  return res.json({ message: 'Profile updated.', user: account.toJSON() })
}

async function becomeAuthor(req, res) {
  if (req.user.role === 'author' || req.user.role === 'admin') {
    return res.json({ message: 'You can already publish posts.', user: req.user })
  }

  req.user.role = 'author'
  await req.user.save()

  return res.json({ message: 'You are now an author.', user: req.user })
}

async function updateUserRole(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'User not found.' })
  }

  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot change your own role.' })
  }

  const { data, errors } = validateRoleUpdate(req.body)

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      message: 'Please check the highlighted fields.',
      errors,
    })
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: data.role },
    { new: true, runValidators: true },
  )

  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  return res.json({
    message: `Role updated to ${user.role}.`,
    user: user.toJSON(),
  })
}

module.exports = { listUsers, listAuthors, getUser, updateMe, becomeAuthor, updateUserRole }

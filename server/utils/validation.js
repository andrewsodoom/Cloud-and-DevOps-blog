const { sanitizePostContent, htmlToText } = require('./content')
const { slugify } = require('./slug')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const POST_STATUSES = ['draft', 'published']
const USER_ROLES = ['reader', 'author', 'admin']
const MAX_TAGS = 6
const TAG_MAX_LENGTH = 30

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeTags(value) {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []
  const tags = []
  const seen = new Set()

  for (const item of source) {
    const tag = slugify(text(item)).slice(0, TAG_MAX_LENGTH)

    if (!tag || seen.has(tag)) continue

    seen.add(tag)
    tags.push(tag)
  }

  return tags
}

function isHttpUrl(value) {
  try {
    const url = new URL(value)

    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateRegistration(body = {}) {
  const name = text(body.name)
  const email = text(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const errors = {}

  if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  } else if (name.length > 80) {
    errors.name = 'Name must be 80 characters or fewer.'
  }

  if (!email) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  } else if (password.length > 72) {
    errors.password = 'Password must be 72 characters or fewer.'
  }

  return { data: { name, email, password }, errors }
}

function validateLogin(body = {}) {
  const email = text(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const errors = {}

  if (!email) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Password is required.'
  }

  return { data: { email, password }, errors }
}

function validatePost(body = {}, { partial = false } = {}) {
  const data = {}
  const errors = {}
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key)
  const check = (key) => !partial || has(key)

  if (check('title')) {
    const title = text(body.title)

    if (title.length < 3) {
      errors.title = 'Title must be at least 3 characters.'
    } else if (title.length > 160) {
      errors.title = 'Title must be 160 characters or fewer.'
    } else {
      data.title = title
    }
  }

  if (check('excerpt')) {
    const excerpt = text(body.excerpt)

    if (excerpt.length > 300) {
      errors.excerpt = 'Excerpt must be 300 characters or fewer.'
    } else {
      data.excerpt = excerpt
    }
  }

  if (check('content')) {
    data.content = sanitizePostContent(body.content)
  }

  if (check('tags')) {
    const rawTags = Array.isArray(body.tags)
      ? body.tags
      : typeof body.tags === 'string'
        ? body.tags.split(',')
        : []
    const nonEmptyTags = rawTags.map(text).filter(Boolean)

    if (nonEmptyTags.length > MAX_TAGS) {
      errors.tags = `Add up to ${MAX_TAGS} tags.`
    } else if (nonEmptyTags.some((tag) => tag.length > TAG_MAX_LENGTH)) {
      errors.tags = `Each tag must be ${TAG_MAX_LENGTH} characters or fewer.`
    } else {
      data.tags = normalizeTags(nonEmptyTags)
    }
  }

  if (check('coverImage')) {
    const coverImage = text(body.coverImage)

    if (coverImage.length > 2048) {
      errors.coverImage = 'Cover image URL must be 2048 characters or fewer.'
    } else if (coverImage && !isHttpUrl(coverImage)) {
      errors.coverImage = 'Cover image must be a valid http:// or https:// URL.'
    } else {
      data.coverImage = coverImage
    }
  }

  if (check('category')) {
    const category = text(body.category) || 'General'

    if (category.length > 60) {
      errors.category = 'Category must be 60 characters or fewer.'
    } else {
      data.category = category
    }
  }

  if (check('status')) {
    const status = text(body.status) || 'draft'

    if (!POST_STATUSES.includes(status)) {
      errors.status = 'Status must be either draft or published.'
    } else {
      data.status = status
    }
  }

  if (check('slug') && text(body.slug)) {
    const slug = text(body.slug).toLowerCase()

    if (slug.length > 160) {
      errors.slug = 'Slug must be 160 characters or fewer.'
    } else if (!SLUG_PATTERN.test(slug)) {
      errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens.'
    } else {
      data.slug = slug
    }
  }

  if (!partial && data.status === 'published' && !htmlToText(data.content)) {
    errors.content = 'Content is required before publishing.'
  }

  return { data, errors }
}

function validateComment(body = {}) {
  const comment = text(body.body ?? body.comment)
  const errors = {}

  if (!comment) {
    errors.body = 'Comment cannot be empty.'
  } else if (comment.length > 2000) {
    errors.body = 'Comment must be 2000 characters or fewer.'
  }

  return { data: { body: comment }, errors }
}

function validateProfileUpdate(body = {}) {
  const data = {}
  const errors = {}

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    const name = text(body.name)

    if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters.'
    } else if (name.length > 80) {
      errors.name = 'Name must be 80 characters or fewer.'
    } else {
      data.name = name
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    const email = text(body.email).toLowerCase()

    if (!email) {
      errors.email = 'Email is required.'
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = 'Enter a valid email address.'
    } else {
      data.email = email
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'password')) {
    const password = typeof body.password === 'string' ? body.password : ''
    const currentPassword =
      typeof body.currentPassword === 'string' ? body.currentPassword : ''

    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.'
    } else if (password.length > 72) {
      errors.password = 'Password must be 72 characters or fewer.'
    } else {
      data.password = password
    }

    if (!currentPassword) {
      errors.currentPassword = 'Enter your current password to set a new one.'
    } else {
      data.currentPassword = currentPassword
    }
  }

  return { data, errors }
}

function validateRoleUpdate(body = {}) {
  const role = text(body.role)
  const errors = {}

  if (!USER_ROLES.includes(role)) {
    errors.role = 'Role must be reader, author, or admin.'
  }

  return { data: { role }, errors }
}

function validateNewsletterSubscription(body = {}) {
  const email = text(body.email).toLowerCase()
  const source = text(body.source) || 'footer'
  const errors = {}

  if (!email) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    errors.email = 'Enter a valid email address.'
  }

  return { data: { email, source }, errors }
}

module.exports = {
  validateRegistration,
  validateLogin,
  validatePost,
  validateComment,
  validateProfileUpdate,
  validateRoleUpdate,
  validateNewsletterSubscription,
  normalizeTags,
}

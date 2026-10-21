const test = require('node:test')
const assert = require('node:assert/strict')

const { slugify } = require('../utils/slug')
const { parsePagination, paginationMeta } = require('../utils/pagination')
const { calculateReadingTime } = require('../utils/post')
const { sanitizePostContent, htmlToText, excerptFromContent } = require('../utils/content')
const { sameId, canViewPost, canManagePost } = require('../utils/postAccess')
const {
  validateRegistration,
  validateLogin,
  validatePost,
  validateComment,
  validateProfileUpdate,
  validateRoleUpdate,
  validateNewsletterSubscription,
  normalizeTags,
} = require('../utils/validation')

test('slugify normalizes text into a URL-safe slug', () => {
  assert.equal(slugify('  Déploiement sur Kubernetes!  '), 'deploiement-sur-kubernetes')
  assert.equal(slugify('Terraform & AWS: A Field Guide'), 'terraform-aws-a-field-guide')
  assert.equal(slugify('---'), 'post')
})

test('slugify caps slugs at 160 characters', () => {
  const slug = slugify('a'.repeat(200))

  assert.equal(slug.length, 160)
})

test('parsePagination applies defaults and bounds', () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 9, skip: 0 })
  assert.deepEqual(parsePagination({ page: '3', limit: '5' }), {
    page: 3,
    limit: 5,
    skip: 10,
  })
  assert.deepEqual(parsePagination({ page: '-2', limit: '500' }), {
    page: 1,
    limit: 50,
    skip: 0,
  })
  assert.deepEqual(parsePagination({ page: 'nope', limit: 'nope' }), {
    page: 1,
    limit: 9,
    skip: 0,
  })
})

test('paginationMeta calculates page counts', () => {
  assert.deepEqual(paginationMeta(2, 9, 10), { page: 2, limit: 9, total: 10, pages: 2 })
  assert.deepEqual(paginationMeta(1, 9, 0), { page: 1, limit: 9, total: 0, pages: 0 })
})

test('calculateReadingTime returns at least one minute', () => {
  assert.equal(calculateReadingTime(''), 1)
  assert.equal(calculateReadingTime('word '.repeat(200)), 1)
  assert.equal(calculateReadingTime('word '.repeat(201)), 2)
})

test('sanitizePostContent keeps safe markup and strips unsafe content', () => {
  const result = sanitizePostContent(
    '<h2>Rollout</h2><script>alert(1)</script><p onclick="bad()">Ship <b>small</b>.</p>' +
      '<img src="javascript:alert(1)" onerror="bad()"><a href="https://example.com">Docs</a>',
  )

  assert.match(result, /<h2>Rollout<\/h2>/)
  assert.match(result, /<strong>small<\/strong>/)
  assert.match(result, /href="https:\/\/example.com"/)
  assert.match(result, /rel="noopener noreferrer"/)
  assert.doesNotMatch(result, /script|onclick|onerror|javascript:/i)
})

test('htmlToText and excerptFromContent produce clean plain text', () => {
  const html = '<p>Hello&nbsp;<strong>world</strong>.</p><p>Second line.</p>'
  const words = Array.from({ length: 40 }, (_, index) => `word${index}`).join(' ')

  assert.equal(htmlToText(html), 'Hello world. Second line.')
  assert.equal(excerptFromContent('<p>Short post.</p>'), 'Short post.')
  assert.ok(excerptFromContent(`<p>${words}</p>`, 60).endsWith('...'))
})

test('validateRegistration trims and normalizes user input', () => {
  const { data, errors } = validateRegistration({
    name: '  Ada Lovelace ',
    email: ' ADA@EXAMPLE.COM ',
    password: '12345678',
  })

  assert.deepEqual(errors, {})
  assert.deepEqual(data, {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: '12345678',
  })
})

test('validateRegistration rejects invalid fields', () => {
  const { errors } = validateRegistration({
    name: 'A',
    email: 'not-an-email',
    password: 'short',
  })

  assert.equal(errors.name, 'Name must be at least 2 characters.')
  assert.equal(errors.email, 'Enter a valid email address.')
  assert.equal(errors.password, 'Password must be at least 8 characters.')
})

test('validateLogin requires an email and password', () => {
  const { data, errors } = validateLogin({ email: ' OPS@EXAMPLE.COM ' })

  assert.equal(data.email, 'ops@example.com')
  assert.equal(errors.password, 'Password is required.')
})

test('validatePost defaults optional fields and requires content to publish', () => {
  const missingContent = validatePost({ title: 'Graceful rollout', status: 'published' })

  assert.equal(missingContent.errors.content, 'Content is required before publishing.')

  const valid = validatePost({
    title: ' Graceful rollout ',
    excerpt: ' How to ship without waking anyone up. ',
    content: 'First, define your rollback path.',
    status: 'published',
  })

  assert.deepEqual(valid.errors, {})
  assert.deepEqual(valid.data, {
    title: 'Graceful rollout',
    excerpt: 'How to ship without waking anyone up.',
    content: 'First, define your rollback path.',
    tags: [],
    category: 'General',
    coverImage: '',
    status: 'published',
  })
})

test('validatePost normalizes and limits tags', () => {
  const valid = validatePost({
    tags: ['Kubernetes', ' CI/CD ', 'kubernetes', 'Platform Engineering'],
  })
  const tooMany = validatePost({ tags: Array.from({ length: 7 }, (_, index) => `tag${index}`) })
  const tooLong = validatePost({ tags: ['a'.repeat(31)] })

  assert.deepEqual(valid.data.tags, ['kubernetes', 'ci-cd', 'platform-engineering'])
  assert.equal(tooMany.errors.tags, 'Add up to 6 tags.')
  assert.equal(tooLong.errors.tags, 'Each tag must be 30 characters or fewer.')
  assert.deepEqual(normalizeTags('AWS, Terraform, AWS'), ['aws', 'terraform'])
})

test('validatePost validates optional cover image URLs', () => {
  const valid = validatePost({ coverImage: 'https://cdn.example.com/cover.jpg' }, { partial: true })
  const invalid = validatePost({ coverImage: 'ftp://cdn.example.com/cover.jpg' }, { partial: true })

  assert.equal(valid.errors.coverImage, undefined)
  assert.equal(valid.data.coverImage, 'https://cdn.example.com/cover.jpg')
  assert.equal(invalid.errors.coverImage, 'Cover image must be a valid http:// or https:// URL.')
})

test('validatePost supports partial updates', () => {
  const { data, errors } = validatePost({ title: 'A better title' }, { partial: true })

  assert.deepEqual(errors, {})
  assert.deepEqual(data, { title: 'A better title' })
})

test('validatePost rejects malformed slugs', () => {
  const { errors } = validatePost({ slug: 'Not A Valid Slug' })

  assert.equal(errors.slug, 'Slug can only contain lowercase letters, numbers, and hyphens.')
})

test('validateComment accepts body or comment aliases', () => {
  assert.deepEqual(validateComment({ body: '  Nice write-up. ' }), {
    data: { body: 'Nice write-up.' },
    errors: {},
  })
  assert.equal(validateComment({}).errors.body, 'Comment cannot be empty.')
})

test('validateProfileUpdate requires the current password for password changes', () => {
  const withoutCurrent = validateProfileUpdate({ password: 'new-password' })

  assert.equal(
    withoutCurrent.errors.currentPassword,
    'Enter your current password to set a new one.',
  )

  const withCurrent = validateProfileUpdate({
    password: 'new-password',
    currentPassword: 'old-password',
  })

  assert.deepEqual(withCurrent.errors, {})
  assert.deepEqual(withCurrent.data, {
    password: 'new-password',
    currentPassword: 'old-password',
  })
})

test('validateRoleUpdate accepts only known roles', () => {
  assert.deepEqual(validateRoleUpdate({ role: 'author' }), {
    data: { role: 'author' },
    errors: {},
  })
  assert.equal(
    validateRoleUpdate({ role: 'owner' }).errors.role,
    'Role must be reader, author, or admin.',
  )
})

test('validateNewsletterSubscription normalizes email and source', () => {
  const valid = validateNewsletterSubscription({ email: ' READER@EXAMPLE.COM ' })
  const invalid = validateNewsletterSubscription({ email: 'not-an-email' })

  assert.deepEqual(valid, {
    data: { email: 'reader@example.com', source: 'footer' },
    errors: {},
  })
  assert.equal(invalid.errors.email, 'Enter a valid email address.')
})

test('sameId compares populated documents and raw ids', () => {
  assert.equal(sameId({ _id: 'abc' }, { _id: 'abc' }), true)
  assert.equal(sameId('abc', 'abc'), true)
  assert.equal(sameId('abc', 'def'), false)
  assert.equal(sameId(null, 'abc'), false)
})

test('canViewPost allows published posts for anonymous readers', () => {
  assert.equal(canViewPost({ status: 'published' }, null), true)
})

test('canViewPost hides drafts from anonymous readers and other users', () => {
  const post = { status: 'draft', author: { _id: 'author-1' } }

  assert.equal(canViewPost(post, null), false)
  assert.equal(canViewPost(post, { _id: 'author-2', role: 'author' }), false)
  assert.equal(canViewPost(post, { _id: 'author-1', role: 'author' }), true)
})

test('canViewPost and canManagePost allow admins', () => {
  const post = { status: 'draft', author: { _id: 'author-1' } }
  const admin = { _id: 'admin-1', role: 'admin' }

  assert.equal(canViewPost(post, admin), true)
  assert.equal(canManagePost(post, admin), true)
})

test('canManagePost requires an authenticated user', () => {
  const post = { author: { _id: 'author-1' } }

  assert.equal(canManagePost(post, null), false)
  assert.equal(canManagePost(null, { _id: 'author-1' }), false)
  assert.equal(canManagePost(post, { _id: 'author-1' }), true)
})

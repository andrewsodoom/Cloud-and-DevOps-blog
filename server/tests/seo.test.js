const test = require('node:test')
const assert = require('node:assert/strict')

const {
  buildRobots,
  buildRssFeed,
  buildSitemap,
  escapeXml,
} = require('../utils/seo')

const posts = [
  {
    title: 'Zero-downtime deploys & rollbacks',
    slug: 'zero-downtime-kubernetes',
    excerpt: 'Ship safely without guessing.',
    category: 'Kubernetes',
    publishedAt: '2026-10-12T09:00:00.000Z',
    updatedAt: '2026-10-13T09:00:00.000Z',
    author: { _id: '507f1f77bcf86cd799439011', name: 'Alex Doe' },
  },
]

test('escapeXml escapes characters that break XML documents', () => {
  assert.equal(
    escapeXml('Cloud & DevOps <guide> "one"'),
    'Cloud &amp; DevOps &lt;guide&gt; &quot;one&quot;',
  )
})

test('buildSitemap includes posts, authors, and escaped URLs', () => {
  const sitemap = buildSitemap('https://example.com/', posts)

  assert.match(sitemap, /<loc>https:\/\/example.com\/<\/loc>/)
  assert.match(sitemap, /<loc>https:\/\/example.com\/posts\/zero-downtime-kubernetes<\/loc>/)
  assert.match(sitemap, /<loc>https:\/\/example.com\/authors\/507f1f77bcf86cd799439011<\/loc>/)
  assert.match(sitemap, /<lastmod>2026-10-13T09:00:00.000Z<\/lastmod>/)
  assert.doesNotMatch(sitemap, /undefined/)
})

test('buildRssFeed includes feed metadata and escaped post content', () => {
  const feed = buildRssFeed('https://example.com', posts)

  assert.match(feed, /<title>CloudCraft Journal<\/title>/)
  assert.match(feed, /<link>https:\/\/example.com\/posts\/zero-downtime-kubernetes<\/link>/)
  assert.match(feed, /<title>Zero-downtime deploys &amp; rollbacks<\/title>/)
  assert.match(feed, /<category>Kubernetes<\/category>/)
  assert.match(feed, /<pubDate>Mon, 12 Oct 2026 09:00:00 GMT<\/pubDate>/)
})

test('buildRobots blocks private areas and declares the sitemap', () => {
  const robots = buildRobots('https://example.com')

  assert.match(robots, /Disallow: \/dashboard/)
  assert.match(robots, /Disallow: \/admin/)
  assert.match(robots, /Sitemap: https:\/\/example.com\/sitemap.xml/)
})

const SITE_NAME = 'CloudCraft Journal'
const SITE_DESCRIPTION =
  'Practical cloud, platform engineering, and DevOps guides for people who ship software.'

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function siteLink(siteUrl, path = '/') {
  return `${String(siteUrl).replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}

function isoDate(value) {
  if (!value) return ''

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function urlEntry({ loc, lastmod, changefreq = 'weekly', priority = '0.7' }) {
  const lines = [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
  ]

  if (lastmod) lines.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`)
  lines.push(`    <changefreq>${changefreq}</changefreq>`)
  lines.push(`    <priority>${priority}</priority>`)
  lines.push('  </url>')

  return lines.join('\n')
}

function uniqueAuthors(posts) {
  const authors = new Map()

  for (const post of posts) {
    const author = post.author

    if (!author?._id || !author.name) continue

    authors.set(String(author._id), {
      id: String(author._id),
      updatedAt: post.updatedAt || post.publishedAt,
    })
  }

  return [...authors.values()]
}

function buildSitemap(siteUrl, posts) {
  const published = posts.filter((post) => post.slug)
  const newest = published.reduce((latest, post) => {
    const value = isoDate(post.updatedAt || post.publishedAt)

    return value && value > latest ? value : latest
  }, '')
  const entries = [
    urlEntry({
      loc: siteLink(siteUrl, '/'),
      lastmod: newest,
      changefreq: 'daily',
      priority: '1.0',
    }),
  ]

  for (const post of published) {
    entries.push(
      urlEntry({
        loc: siteLink(siteUrl, `/posts/${encodeURIComponent(post.slug)}`),
        lastmod: isoDate(post.updatedAt || post.publishedAt),
        priority: '0.8',
      }),
    )
  }

  for (const author of uniqueAuthors(published)) {
    entries.push(
      urlEntry({
        loc: siteLink(siteUrl, `/authors/${encodeURIComponent(author.id)}`),
        lastmod: isoDate(author.updatedAt),
        changefreq: 'monthly',
        priority: '0.5',
      }),
    )
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')
}

function buildRssFeed(siteUrl, posts, { limit = 20 } = {}) {
  const published = posts
    .filter((post) => post.slug && post.title)
    .sort(
      (left, right) =>
        new Date(right.publishedAt || right.createdAt || 0) -
        new Date(left.publishedAt || left.createdAt || 0),
    )
    .slice(0, limit)
  const latest = isoDate(published[0]?.publishedAt || published[0]?.createdAt)

  const items = published.map((post) => {
    const link = siteLink(siteUrl, `/posts/${encodeURIComponent(post.slug)}`)
    const description = post.excerpt || SITE_DESCRIPTION
    const pubDate = new Date(post.publishedAt || post.createdAt || Date.now())

    return [
      '    <item>',
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <description>${escapeXml(description)}</description>`,
      `      <pubDate>${pubDate.toUTCString()}</pubDate>`,
      post.author?.name
        ? `      <dc:creator>${escapeXml(post.author.name)}</dc:creator>`
        : '',
      post.category
        ? `      <category>${escapeXml(post.category)}</category>`
        : '',
      '    </item>',
    ]
      .filter(Boolean)
      .join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${escapeXml(SITE_NAME)}</title>`,
    `    <link>${escapeXml(siteLink(siteUrl, '/'))}</link>`,
    `    <description>${escapeXml(SITE_DESCRIPTION)}</description>`,
    '    <language>en-us</language>',
    latest ? `    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>` : '',
    `    <atom:link href="${escapeXml(siteLink(siteUrl, '/feed.xml'))}" rel="self" type="application/rss+xml" />`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildRobots(siteUrl) {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /dashboard',
    'Disallow: /admin',
    'Disallow: /bookmarks',
    'Disallow: /settings',
    '',
    `Sitemap: ${siteLink(siteUrl, '/sitemap.xml')}`,
    '',
  ].join('\n')
}

module.exports = {
  SITE_DESCRIPTION,
  SITE_NAME,
  buildRobots,
  buildRssFeed,
  buildSitemap,
  escapeXml,
  siteLink,
}

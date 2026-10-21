const crypto = require('node:crypto')
const { excerptFromContent, htmlToText, sanitizePostContent } = require('./content')

const CACHE_TTL_MS = 10 * 60 * 1000
const FETCH_TIMEOUT_MS = 10000
const DEFAULT_LIMIT = 12
const MAX_LIMIT = 30
const DETAIL_CONTENT_MIN_LENGTH = 360

const SOURCES = [
  {
    id: 'thenewstack',
    name: 'The New Stack',
    homepage: 'https://thenewstack.io/',
    url: 'https://thenewstack.io/feed/',
    type: 'rss',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Engineering',
    homepage: 'https://www.linkedin.com/blog/engineering',
    url: 'https://www.linkedin.com/blog/engineering',
    type: 'linkedin',
  },
  {
    id: 'cncf',
    name: 'CNCF',
    homepage: 'https://www.cncf.io/blog/',
    url: 'https://www.cncf.io/feed/',
    type: 'rss',
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes Blog',
    homepage: 'https://kubernetes.io/blog/',
    url: 'https://kubernetes.io/feed.xml',
    type: 'rss',
  },
  {
    id: 'aws-devops',
    name: 'AWS DevOps',
    homepage: 'https://aws.amazon.com/blogs/devops/',
    url: 'https://aws.amazon.com/blogs/devops/feed/',
    type: 'rss',
  },
  {
    id: 'hashicorp',
    name: 'HashiCorp',
    homepage: 'https://www.hashicorp.com/blog',
    url: 'https://www.hashicorp.com/blog/feed.xml',
    type: 'rss',
  },
]

const FEED_HEADERS = {
  Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html',
  'User-Agent':
    'Mozilla/5.0 (compatible; CloudCraftJournal/1.0; +https://github.com/) AppleWebKit/537.36 Chrome/120 Safari/537.36',
}

let cache = {
  fetchedAt: 0,
  articles: [],
  sources: [],
  updatedAt: null,
}
let refreshPromise = null

function decodeXmlEntities(value) {
  return String(value ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
}

function unwrapCdata(value) {
  return String(value ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

function cleanText(value) {
  return decodeXmlEntities(unwrapCdata(value))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstTag(block, tagName) {
  const pattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  const match = block.match(pattern)

  return match ? match[1] : ''
}

function extractLink(block) {
  const textLink = firstTag(block, 'link')

  if (textLink && !/<[a-z]/i.test(textLink)) {
    return decodeXmlEntities(unwrapCdata(textLink)).trim()
  }

  const links = Array.from(block.matchAll(/<link\b([^>]*)>/gi))

  for (const link of links) {
    const attributes = link[1]
    const rel = attributes.match(/\brel=["']([^"']+)["']/i)?.[1]

    if (rel && rel.toLowerCase() !== 'alternate') continue

    const href = attributes.match(/\bhref=["']([^"']+)["']/i)?.[1]

    if (href) return decodeXmlEntities(href).trim()
  }

  return ''
}

function extractAuthor(block) {
  const creator = firstTag(block, 'dc:creator')

  if (creator) return cleanText(creator)

  const authorBlock = firstTag(block, 'author')

  if (!authorBlock) return ''

  return cleanText(firstTag(authorBlock, 'name') || authorBlock)
}

function extractDate(block) {
  const raw =
    firstTag(block, 'pubDate') ||
    firstTag(block, 'published') ||
    firstTag(block, 'updated') ||
    firstTag(block, 'dc:date')
  const date = new Date(cleanText(raw))

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function extractTags(block) {
  const tags = []
  const pattern = /<category\b([^>]*)>([\s\S]*?)<\/category>/gi

  for (const match of block.matchAll(pattern)) {
    const value = match[2].trim() ? match[2] : match[1].match(/\bterm=["']([^"']+)["']/i)?.[1]
    const tag = cleanText(value).slice(0, 30)

    if (tag && !tags.includes(tag)) tags.push(tag)
  }

  return tags.slice(0, 3)
}

function extractImage(block) {
  const media =
    block.match(/<media:(?:content|thumbnail)\b[^>]*\burl=["']([^"']+)["']/i)?.[1] || ''
  const enclosure =
    block.match(/<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*\btype=["']image\//i)?.[1] ||
    block.match(/<enclosure\b[^>]*\btype=["']image\/[^"']*["'][^>]*\burl=["']([^"']+)["']/i)?.[1] ||
    ''
  const inlineImage =
    decodeXmlEntities(unwrapCdata(block)).match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] || ''
  const image = decodeXmlEntities(media || enclosure || inlineImage).trim()

  return /^https?:\/\//i.test(image) ? image : ''
}

function extractSummary(block) {
  const raw =
    firstTag(block, 'description') ||
    firstTag(block, 'summary') ||
    firstTag(block, 'content:encoded') ||
    firstTag(block, 'content')

  return excerptFromContent(decodeXmlEntities(unwrapCdata(raw)), 190)
}

function extractContent(block) {
  const raw =
    firstTag(block, 'content:encoded') ||
    firstTag(block, 'content') ||
    firstTag(block, 'description') ||
    firstTag(block, 'summary')

  return sanitizePostContent(decodeXmlEntities(unwrapCdata(raw)))
}

function createArticleId(sourceId, url) {
  const digest = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16)

  return `${sourceId}-${digest}`
}

function toArticle(
  { title, url, excerpt, content, author, publishedAt, tags, image },
  source,
) {
  return {
    id: createArticleId(source.id, url),
    title: title.slice(0, 220),
    url,
    excerpt,
    content: content || '',
    author: author.slice(0, 120),
    publishedAt,
    tags,
    image,
    source: {
      id: source.id,
      name: source.name,
      homepage: source.homepage,
    },
  }
}

function parseRssXml(xml, source = {}) {
  const blocks = Array.from(String(xml ?? '').matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi))

  return blocks
    .map((match) => {
      const block = match[0]
      const title = cleanText(firstTag(block, 'title'))
      const url = extractLink(block)

      if (!title || !/^https?:\/\//i.test(url)) return null

      return toArticle(
        {
          title,
          url,
          excerpt: extractSummary(block),
          content: extractContent(block),
          author: extractAuthor(block),
          publishedAt: extractDate(block),
          tags: extractTags(block),
          image: extractImage(block),
        },
        source,
      )
    })
    .filter(Boolean)
}

function titleCase(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

function parseLinkedInHtml(html, source = {}) {
  const blocks = Array.from(
    String(html ?? '').matchAll(/<li class="post-list__item grid-post">[\s\S]*?<\/li>/gi),
  )

  return blocks
    .map((match) => {
      const block = match[0]
      const linkMatch = block.match(
        /<a class="grid-post__link[^"]*"\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
      )
      const url = decodeXmlEntities(linkMatch?.[1] || '').trim()
      const title = cleanText(linkMatch?.[2] || '')

      if (!title || !/^https?:\/\//i.test(url)) return null

      const author = cleanText(
        block.match(/<p class="grid-post__author[^"]*">([\s\S]*?)<\/p>/i)?.[1] || '',
      )
      const date = cleanText(
        block.match(/<p class="grid-post__date[^"]*">([\s\S]*?)<\/p>/i)?.[1] || '',
      )
      const parsedDate = new Date(date)
      const image = decodeXmlEntities(
        block.match(/data-delayed-url="([^"]+)"/i)?.[1] ||
          block.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1] ||
          '',
      )
      const category = url.split('/blog/engineering/')[1]?.split('/')[0] || ''

      return toArticle(
        {
          title,
          url,
          excerpt: '',
          content: '',
          author: titleCase(author),
          publishedAt: Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString(),
          tags: category ? [titleCase(category.replace(/-/g, ' '))] : [],
          image: /^https?:\/\//i.test(image) ? image : '',
        },
        source,
      )
    })
    .filter(Boolean)
}

function stripDuplicateImages(content, image) {
  if (!content || !image) return content

  const source = decodeXmlEntities(image).trim()

  if (!source) return content

  const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const imagePattern = new RegExp(`<img\\b[^>]*\\bsrc=["']${escaped}["'][^>]*>`, 'gi')
  const emptyLinkPattern = new RegExp(
    `<a\\b[^>]*\\bhref=["']${escaped}["'][^>]*>\\s*</a>`,
    'gi',
  )

  return content.replace(imagePattern, '').replace(emptyLinkPattern, '')
}

function toPublicArticle(article) {
  const { content, ...publicArticle } = article

  return publicArticle
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: FEED_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`${source.name} responded with ${response.status}.`)
  }

  const body = await response.text()

  return source.type === 'linkedin'
    ? parseLinkedInHtml(body, source)
    : parseRssXml(body, source)
}

function dedupeArticles(articles) {
  const seen = new Set()

  return articles.filter((article) => {
    const key = article.url.toLowerCase()

    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

function sortByDate(articles) {
  return [...articles].sort((left, right) => {
    const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0
    const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0

    return rightTime - leftTime
  })
}

function groupBySource(articles) {
  const grouped = new Map()

  for (const article of articles) {
    const list = grouped.get(article.source.id) || []
    list.push(article)
    grouped.set(article.source.id, list)
  }

  return grouped
}

async function refreshFeeds() {
  const previous = groupBySource(cache.articles)
  const results = await Promise.all(
    SOURCES.map(async (source) => {
      try {
        return { source, articles: await fetchSource(source), error: null }
      } catch (error) {
        return { source, articles: [], error }
      }
    }),
  )

  const articles = []
  const sources = []

  for (const result of results) {
    const previousArticles = previous.get(result.source.id) || []
    const usable =
      result.error && previousArticles.length > 0 ? previousArticles : result.articles

    if (result.error && !previousArticles.length) {
      console.warn(`External feed unavailable (${result.source.name}): ${result.error.message}`)
    }

    articles.push(...usable)
    sources.push({
      id: result.source.id,
      name: result.source.name,
      homepage: result.source.homepage,
      count: usable.length,
      status: result.error && !previousArticles.length ? 'error' : 'ok',
    })
  }

  const merged = sortByDate(dedupeArticles(articles))

  if (merged.length > 0 || cache.articles.length > 0) {
    cache = {
      fetchedAt: Date.now(),
      articles: merged,
      sources,
      updatedAt: new Date().toISOString(),
    }

    return cache
  }

  return {
    fetchedAt: 0,
    articles: [],
    sources,
    updatedAt: new Date().toISOString(),
  }
}

function loadFeedData() {
  if (cache.fetchedAt && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return Promise.resolve(cache)
  }

  if (!refreshPromise) {
    refreshPromise = refreshFeeds().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

async function getExternalArticles({ limit = DEFAULT_LIMIT, source: sourceId = '' } = {}) {
  const data = await loadFeedData()
  const safeLimit = Number.isFinite(Number(limit))
    ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(Number(limit))))
    : DEFAULT_LIMIT
  const requestedSource = String(sourceId || '').trim().toLowerCase()
  const filtered = requestedSource
    ? data.articles.filter((article) => article.source.id === requestedSource)
    : data.articles

  return {
    articles: filtered.slice(0, safeLimit).map(toPublicArticle),
    sources: data.sources,
    updatedAt: data.updatedAt,
  }
}

async function getExternalArticle(id) {
  const articleId = String(id || '').trim()

  if (!/^[a-z0-9-]{1,80}$/i.test(articleId)) return null

  const data = await loadFeedData()
  const article = data.articles.find((candidate) => candidate.id === articleId)

  if (!article) return null

  const content = article.content || ''
  const finalContent = content ? stripDuplicateImages(content, article.image) : ''
  const wordCount = htmlToText(finalContent).split(/\s+/).filter(Boolean).length

  return {
    ...toPublicArticle(article),
    content: finalContent,
    readingTime: finalContent ? Math.max(1, Math.round(wordCount / 220)) : null,
    hasFullContent: content.length >= DETAIL_CONTENT_MIN_LENGTH,
    sourceUrl: article.url,
  }
}

module.exports = {
  SOURCES,
  getExternalArticle,
  getExternalArticles,
  parseRssXml,
  parseLinkedInHtml,
  stripDuplicateImages,
}

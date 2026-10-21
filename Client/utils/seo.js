const SITE_NAME = 'CloudCraft Journal'
const DEFAULT_DESCRIPTION =
  'Practical cloud, platform engineering, and DevOps guides for people who ship software.'
const DEFAULT_IMAGE = '/og-default.png'

function siteBase() {
  const configured = import.meta.env.VITE_SITE_URL

  if (configured) return configured.replace(/\/$/, '')

  return window.location.origin
}

export function absoluteUrl(value) {
  if (!value) return ''

  try {
    return new URL(value, `${siteBase()}/`).href
  } catch {
    return ''
  }
}

function upsertMeta(attribute, key, content) {
  if (!content) return

  let element = document.head.querySelector(`meta[${attribute}="${key}"]`)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

function removeMeta(attribute, key) {
  document.head
    .querySelectorAll(`meta[${attribute}="${key}"]`)
    .forEach((element) => element.remove())
}

function upsertLink(rel, href) {
  if (!href) return

  let element = document.head.querySelector(`link[rel="${rel}"]`)

  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }

  element.setAttribute('href', href)
}

function structuredDataScript(payload) {
  const data = Array.isArray(payload)
    ? { '@context': 'https://schema.org', '@graph': payload }
    : payload

  let element = document.getElementById('cloudcraft-structured-data')

  if (!element) {
    element = document.createElement('script')
    element.id = 'cloudcraft-structured-data'
    element.type = 'application/ld+json'
    document.head.appendChild(element)
  }

  element.textContent = JSON.stringify(data).replace(/</g, '\\u003c')
}

export function applySeo({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  canonical: canonicalOverride,
  image = DEFAULT_IMAGE,
  type = 'website',
  noIndex = false,
  publishedAt,
  modifiedAt,
  author,
  section,
  tags = [],
  jsonLd,
} = {}) {
  const pageTitle = title
    ? title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`
    : `${SITE_NAME} | Cloud & DevOps insights`
  const canonicalPath = path || `${window.location.pathname}${window.location.search}`
  const canonical = canonicalOverride ? absoluteUrl(canonicalOverride) : absoluteUrl(canonicalPath)
  const imageUrl = absoluteUrl(image)

  document.title = pageTitle

  upsertMeta('name', 'description', description)
  upsertMeta(
    'name',
    'robots',
    noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
  )

  upsertLink('canonical', canonical)
  upsertLink('alternate', absoluteUrl('/feed.xml'))
  const feedLink = document.head.querySelector('link[rel="alternate"]')
  if (feedLink) feedLink.setAttribute('type', 'application/rss+xml')

  upsertMeta('property', 'og:site_name', SITE_NAME)
  upsertMeta('property', 'og:type', type)
  upsertMeta('property', 'og:title', pageTitle)
  upsertMeta('property', 'og:description', description)
  upsertMeta('property', 'og:url', canonical)
  upsertMeta('property', 'og:image', imageUrl)
  upsertMeta('property', 'og:image:alt', pageTitle)
  upsertMeta('property', 'og:locale', 'en_US')

  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', pageTitle)
  upsertMeta('name', 'twitter:description', description)
  upsertMeta('name', 'twitter:image', imageUrl)

  removeMeta('property', 'article:published_time')
  removeMeta('property', 'article:modified_time')
  removeMeta('property', 'article:section')
  removeMeta('property', 'article:author')
  removeMeta('property', 'article:tag')

  if (publishedAt) {
    upsertMeta('property', 'article:published_time', new Date(publishedAt).toISOString())
    upsertMeta('property', 'article:modified_time', new Date(modifiedAt || publishedAt).toISOString())
  }

  if (section) upsertMeta('property', 'article:section', section)
  if (author) upsertMeta('property', 'article:author', author)

  for (const tag of tags.slice(0, 12)) {
    upsertMeta('property', 'article:tag', tag)
  }

  if (jsonLd) {
    structuredDataScript(jsonLd)
  } else {
    document.getElementById('cloudcraft-structured-data')?.remove()
  }
}

export { DEFAULT_DESCRIPTION, SITE_NAME }

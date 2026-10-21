const sanitizeHtml = require('sanitize-html')

const ALLOWED_TAGS = [
  'p',
  'br',
  'h2',
  'h3',
  'h4',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'blockquote',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'pre',
  'code',
  'hr',
]

function sanitizePostContent(value) {
  return sanitizeHtml(String(value ?? ''), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
        },
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          loading: 'lazy',
        },
      }),
      b: 'strong',
      i: 'em',
    },
  }).trim()
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function htmlToText(value) {
  const spaced = String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|h[1-6]|li|blockquote|pre|div)>/gi, ' ')
  const stripped = sanitizeHtml(spaced, {
    allowedTags: [],
    allowedAttributes: {},
  })

  return decodeEntities(stripped).replace(/\s+/g, ' ').trim()
}

function excerptFromContent(value, maxLength = 220) {
  const plain = htmlToText(value)

  if (plain.length <= maxLength) return plain

  const shortened = plain.slice(0, maxLength)
  const lastSpace = shortened.lastIndexOf(' ')

  return `${shortened.slice(0, lastSpace > 80 ? lastSpace : maxLength).trim()}...`
}

module.exports = { sanitizePostContent, htmlToText, excerptFromContent }

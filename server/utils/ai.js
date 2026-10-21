const { htmlToText } = require('./content')
const { normalizeTags } = require('./validation')

const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'against',
  'also',
  'because',
  'been',
  'before',
  'being',
  'between',
  'both',
  'could',
  'does',
  'doing',
  'down',
  'each',
  'from',
  'further',
  'have',
  'having',
  'here',
  'into',
  'just',
  'more',
  'most',
  'much',
  'must',
  'only',
  'other',
  'over',
  'same',
  'should',
  'some',
  'such',
  'than',
  'that',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'under',
  'until',
  'very',
  'want',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'will',
  'with',
  'would',
  'your',
  'you',
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'can',
  'how',
  'why',
  'our',
  'out',
  'all',
  'any',
  'its',
  'it',
  'is',
  'of',
  'to',
  'in',
  'on',
  'as',
  'at',
  'by',
  'or',
  'an',
  'a',
])

function titleCase(value) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function extractKeywords(value, limit = 8) {
  const counts = new Map()
  const words = htmlToText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))

  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1)
  }

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1]
      return left[0].localeCompare(right[0])
    })
    .slice(0, limit)
    .map(([word]) => word)
}

function firstSentences(value, maxLength = 240) {
  const plain = htmlToText(value)

  if (!plain) return ''

  const sentences = plain.match(/[^.!?]+[.!?]+/g) || [plain]
  let excerpt = ''

  for (const sentence of sentences) {
    if ((excerpt + sentence).trim().length > maxLength) break

    excerpt += `${sentence.trim()} `
  }

  if (!excerpt) excerpt = `${plain.slice(0, maxLength - 3).trim()}...`

  return excerpt.trim()
}

function uniqueList(values, limit = 6) {
  return [...new Set(values.filter(Boolean))].slice(0, limit)
}

function buildLocalSuggestions({ title, content, category, tags }) {
  const cleanTitle = String(title || '').trim()
  const plain = htmlToText(content)
  const keywords = extractKeywords(`${cleanTitle} ${plain}`, 10)
  const categoryTags = normalizeTags([category])
  const sourceTags = normalizeTags(tags)
  const suggestedTags = uniqueList([...sourceTags, ...categoryTags, ...keywords], 6)
  const topic = titleCase(keywords[0] || cleanTitle || category || 'cloud engineering')

  const candidateTitles = cleanTitle
    ? [
        `${cleanTitle}: A Practical Field Guide`,
        `${cleanTitle} Without the Guesswork`,
        `Lessons Learned From ${cleanTitle}`,
      ]
    : [
        `A Practical Field Guide to ${topic}`,
        `What Production Taught Us About ${topic}`,
        `${topic} Without the Guesswork`,
      ]

  const titles = uniqueList(
    candidateTitles
      .map((value) => value.replace(/\s+/g, ' ').trim())
      .filter((value) => value.length >= 3 && value.length <= 160),
    3,
  )

  const excerpt =
    firstSentences(content, 280) ||
    (cleanTitle
      ? `A practical, field-tested look at ${cleanTitle.toLowerCase()}.`
      : 'Practical cloud and DevOps lessons from production.')

  return {
    titles,
    excerpt: excerpt.slice(0, 300),
    tags: suggestedTags,
    seoTitle: (cleanTitle || titles[0] || 'CloudCraft field note').slice(0, 60),
    seoDescription: excerpt.slice(0, 155),
  }
}

function confirmationSuggestions(suggestions) {
  return {
    titles: Array.isArray(suggestions?.titles)
      ? suggestions.titles.map((value) => String(value).slice(0, 160)).slice(0, 3)
      : [],
    excerpt: String(suggestions?.excerpt || '').slice(0, 300),
    tags: normalizeTags(suggestions?.tags).slice(0, 6),
    seoTitle: String(suggestions?.seoTitle || '').slice(0, 60),
    seoDescription: String(suggestions?.seoDescription || '').slice(0, 155),
  }
}

module.exports = {
  buildLocalSuggestions,
  confirmationSuggestions,
  extractKeywords,
  firstSentences,
}

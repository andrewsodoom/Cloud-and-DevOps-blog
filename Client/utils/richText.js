const HTML_PATTERN = /<\/?[a-z][\s\S]*>/i

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function plainTextToHtml(value = '') {
  const text = String(value).replace(/\r\n/g, '\n').trim()

  if (!text) return ''

  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function contentToHtml(value = '') {
  const content = String(value || '').trim()

  if (!content) return ''
  if (HTML_PATTERN.test(content)) return content

  return plainTextToHtml(content)
}

export function stripHtml(value = '') {
  return String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|h[2-4]|li|blockquote|pre)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function wordCount(value = '') {
  const plain = stripHtml(value)
  return plain ? plain.split(/\s+/).filter(Boolean).length : 0
}

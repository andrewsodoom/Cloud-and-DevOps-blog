export const MAX_TAGS = 6

export function normalizeTag(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}

export function addTag(tags, value) {
  const tag = normalizeTag(value)

  if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return tags

  return [...tags, tag]
}

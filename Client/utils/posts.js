const tones = ['mint', 'blue', 'violet']

export function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export function getInitials(name = '') {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return initials || 'CC'
}

export function toArticle(post, index) {
  return {
    id: post.id,
    slug: post.slug,
    category: post.category || 'General',
    title: post.title,
    excerpt: post.excerpt || '',
    coverImage: post.coverImage || '',
    tags: Array.isArray(post.tags) ? post.tags : [],
    author: post.author?.name || 'CloudCraft',
    readTime: `${post.readingTime || 1} min read`,
    date: formatDate(post.publishedAt || post.createdAt),
    tone: tones[index % tones.length],
  }
}

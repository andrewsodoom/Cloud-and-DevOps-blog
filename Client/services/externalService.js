import { apiRequest } from './api'

function queryString(params = {}) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value)
    }
  }

  const query = search.toString()
  return query ? `?${query}` : ''
}

export function listExternalArticles(params = {}, signal) {
  return apiRequest(`/external${queryString(params)}`, { signal })
}

export function getExternalArticle(id, signal) {
  return apiRequest(`/external/${encodeURIComponent(id)}`, { signal })
}

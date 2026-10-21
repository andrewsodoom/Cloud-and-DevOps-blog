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

export function listPosts(params = {}, signal) {
  return apiRequest(`/posts${queryString(params)}`, { signal })
}

export function listTrendingPosts(params = {}, signal) {
  return apiRequest(`/posts/trending${queryString(params)}`, { signal })
}

export function listBookmarks(signal) {
  return apiRequest('/posts/bookmarks', { signal })
}

export function getPost(slug, signal) {
  return apiRequest(`/posts/${encodeURIComponent(slug)}`, { signal })
}

export function listMyPosts(params = {}, signal) {
  return apiRequest(`/posts/mine${queryString(params)}`, { signal })
}

export function createPost(post) {
  return apiRequest('/posts', { method: 'POST', body: post })
}

export function updatePost(id, changes) {
  return apiRequest(`/posts/${id}`, { method: 'PATCH', body: changes })
}

export function deletePost(id) {
  return apiRequest(`/posts/${id}`, { method: 'DELETE' })
}

export function toggleLike(id) {
  return apiRequest(`/posts/${id}/like`, { method: 'POST' })
}

export function toggleBookmark(id) {
  return apiRequest(`/posts/${id}/bookmark`, { method: 'POST' })
}

export function listComments(id, params = {}, signal) {
  return apiRequest(`/posts/${id}/comments${queryString(params)}`, { signal })
}

export function createComment(id, body) {
  return apiRequest(`/posts/${id}/comments`, { method: 'POST', body: { body } })
}

export function deleteComment(postId, commentId) {
  return apiRequest(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' })
}

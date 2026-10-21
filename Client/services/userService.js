import { apiRequest } from './api'

export function updateProfile(changes) {
  return apiRequest('/users/me', { method: 'PATCH', body: changes })
}

export function becomeAuthor() {
  return apiRequest('/users/me/become-author', { method: 'POST' })
}

export function listAuthors() {
  return apiRequest('/users/authors')
}

export function getUser(id, signal) {
  return apiRequest(`/users/${id}`, { signal })
}

export function listUsers(params = {}, signal) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value)
    }
  }

  const query = search.toString()
  return apiRequest(`/users${query ? `?${query}` : ''}`, { signal })
}

export function updateUserRole(id, role) {
  return apiRequest(`/users/${id}/role`, { method: 'PATCH', body: { role } })
}

import { apiRequest } from './api'

export function uploadImage(file) {
  const body = new FormData()
  body.append('image', file)

  return apiRequest('/uploads', { method: 'POST', body })
}

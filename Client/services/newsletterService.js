import { apiRequest } from './api'

export function subscribeToNewsletter(email, source = 'footer') {
  return apiRequest('/newsletter', { method: 'POST', body: { email, source } })
}

import { apiRequest } from './api'

export function getContentSuggestions(draft) {
  return apiRequest('/ai/suggestions', { method: 'POST', body: draft })
}

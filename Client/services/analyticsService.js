import { apiRequest } from './api'

export function getAnalyticsOverview(signal) {
  return apiRequest('/analytics/overview', { signal })
}

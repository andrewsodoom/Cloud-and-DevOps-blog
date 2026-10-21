const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, errors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  const headers = {}
  const hasBody = body !== undefined
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  if (hasBody && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: hasBody ? (isFormData ? body : JSON.stringify(body)) : undefined,
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error

    throw new ApiError('Cannot reach the API. Make sure the server is running.', 0)
  }

  const text = await response.text()
  let payload = null

  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || `Request failed with status ${response.status}.`,
      response.status,
      payload?.errors || {},
    )
  }

  return payload
}

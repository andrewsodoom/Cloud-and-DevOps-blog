import { apiRequest } from './api'

export async function register({ name, email, password }) {
  const payload = await apiRequest('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  })

  return payload.user
}

export async function login({ email, password }) {
  const payload = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  })

  return payload.user
}

export async function getCurrentUser() {
  const payload = await apiRequest('/auth/me')
  return payload.user
}

export async function logout() {
  await apiRequest('/auth/logout', { method: 'POST' })
}

const jwt = require('jsonwebtoken')
const env = require('../config/env')

function signToken(user) {
  return jwt.sign(
    {
      sub: String(user._id || user.id),
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  )
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret)
}

function tokenFromRequest(req) {
  const cookieToken = req.cookies?.[env.cookieName]
  const authorization = req.headers.authorization
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null

  return cookieToken || bearerToken || null
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    maxAge: env.cookieMaxAgeMs,
    path: '/',
  }
}

function clearCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
  }
}

module.exports = {
  signToken,
  verifyToken,
  tokenFromRequest,
  cookieOptions,
  clearCookieOptions,
}

const User = require('../models/User')
const { verifyToken, tokenFromRequest } = require('../utils/auth')

async function optionalAuthenticate(req, res, next) {
  const token = tokenFromRequest(req)

  if (!token) {
    return next()
  }

  try {
    const payload = verifyToken(token)
    const user = await User.findById(payload.sub)

    if (user) {
      req.user = user
    }
  } catch {
    return next()
  }

  return next()
}

function requireRole(...roles) {
  return function authorizeRole(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `This action requires one of these roles: ${roles.join(', ')}.`,
      })
    }

    return next()
  }
}

module.exports = { optionalAuthenticate, requireRole }

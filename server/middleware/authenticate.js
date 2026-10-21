const User = require('../models/User')
const { verifyToken, tokenFromRequest } = require('../utils/auth')

async function authenticate(req, res, next) {
  const token = tokenFromRequest(req)

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' })
  }

  let payload

  try {
    payload = verifyToken(token)
  } catch {
    return res.status(401).json({ message: 'Your session is invalid or has expired.' })
  }

  try {
    const user = await User.findById(payload.sub)

    if (!user) {
      return res.status(401).json({ message: 'Your session is no longer valid.' })
    }

    req.user = user
    return next()
  } catch (error) {
    return next(error)
  }
}

module.exports = authenticate

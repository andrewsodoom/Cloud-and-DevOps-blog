const bcrypt = require('bcryptjs')
const env = require('../config/env')
const User = require('../models/User')
const {
  signToken,
  cookieOptions,
  clearCookieOptions,
} = require('../utils/auth')
const { validateRegistration, validateLogin } = require('../utils/validation')

async function register(req, res) {
  const { data, errors } = validateRegistration(req.body)

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      message: 'Please check the highlighted fields.',
      errors,
    })
  }

  const existing = await User.exists({ email: data.email })

  if (existing) {
    return res.status(409).json({
      message: 'An account with that email already exists.',
      errors: { email: 'Email is already registered.' },
    })
  }

  try {
    const passwordHash = await bcrypt.hash(data.password, 12)
    const created = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
    })
    const user = created.toJSON()

    res.cookie(env.cookieName, signToken(user), cookieOptions())

    return res.status(201).json({
      message: 'Account created.',
      user,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with that email already exists.',
        errors: { email: 'Email is already registered.' },
      })
    }

    throw error
  }
}

async function login(req, res) {
  const { data, errors } = validateLogin(req.body)

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      message: 'Please check the highlighted fields.',
      errors,
    })
  }

  const account = await User.findOne({ email: data.email }).select('+passwordHash')
  const passwordMatches = account
    ? await bcrypt.compare(data.password, account.passwordHash)
    : false

  if (!account || !passwordMatches) {
    return res.status(401).json({ message: 'Email or password is incorrect.' })
  }

  const user = account.toJSON()

  res.cookie(env.cookieName, signToken(user), cookieOptions())

  return res.json({
    message: 'Logged in.',
    user,
  })
}

function logout(req, res) {
  res.clearCookie(env.cookieName, clearCookieOptions())
  return res.json({ message: 'Logged out.' })
}

function me(req, res) {
  return res.json({ user: req.user })
}

module.exports = { register, login, logout, me }

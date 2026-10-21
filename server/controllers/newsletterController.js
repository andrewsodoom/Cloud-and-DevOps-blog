const Subscriber = require('../models/Subscriber')
const { validateNewsletterSubscription } = require('../utils/validation')

async function subscribe(req, res) {
  const { data, errors } = validateNewsletterSubscription(req.body)

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      message: 'Please check the highlighted fields.',
      errors,
    })
  }

  const existing = await Subscriber.exists({ email: data.email })

  if (existing) {
    return res.json({
      message: 'You are already on the list. Look out for the next dispatch.',
      alreadySubscribed: true,
    })
  }

  try {
    await Subscriber.create(data)
  } catch (error) {
    if (error.code === 11000) {
      return res.json({
        message: 'You are already on the list. Look out for the next dispatch.',
        alreadySubscribed: true,
      })
    }

    throw error
  }

  return res.status(201).json({
    message: 'You are on the list. The next field note is on its way.',
    alreadySubscribed: false,
  })
}

async function listSubscribers(req, res) {
  const [total, subscribers] = await Promise.all([
    Subscriber.countDocuments(),
    Subscriber.find().sort({ createdAt: -1 }).limit(20).lean(),
  ])

  return res.json({
    total,
    subscribers: subscribers.map((subscriber) => ({
      id: String(subscriber._id),
      email: subscriber.email,
      source: subscriber.source,
      createdAt: subscriber.createdAt,
    })),
  })
}

module.exports = { subscribe, listSubscribers }

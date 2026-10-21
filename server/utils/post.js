const { htmlToText } = require('./content')

const WORDS_PER_MINUTE = 200

function calculateReadingTime(content) {
  const words = htmlToText(content).split(/\s+/).filter(Boolean).length

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

module.exports = { calculateReadingTime }

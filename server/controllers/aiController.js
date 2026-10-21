const env = require('../config/env')
const { htmlToText } = require('../utils/content')
const {
  buildLocalSuggestions,
  confirmationSuggestions,
} = require('../utils/ai')

async function requestOpenAI(input) {
  const prompt = [
    'You are an editor for a practical cloud engineering blog.',
    'Return only JSON with this shape:',
    '{"titles":[3 headline options],"excerpt":"one or two sentence summary up to 280 characters","tags":[up to 6 lowercase hyphenated tags],"seoTitle":"up to 60 characters","seoDescription":"up to 155 characters"}',
    'Keep titles specific, useful, and free of hype.',
    `Current title: ${input.title || '(none)'}`,
    `Category: ${input.category || 'General'}`,
    `Existing tags: ${(input.tags || []).join(', ') || '(none)'}`,
    `Article content:\n${htmlToText(input.content).slice(0, 12000)}`,
  ].join('\n\n')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.openaiModel,
      temperature: 0.6,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`)
  }

  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('OpenAI returned an empty response.')
  }

  return confirmationSuggestions(JSON.parse(content))
}

async function suggestContent(req, res) {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  const content = typeof req.body?.content === 'string' ? req.body.content : ''
  const category = typeof req.body?.category === 'string' ? req.body.category.trim() : ''
  const tags = Array.isArray(req.body?.tags) ? req.body.tags : []

  if (!title && !htmlToText(content)) {
    return res.status(422).json({
      message: 'Add a title or some content before asking for suggestions.',
    })
  }

  const fallback = buildLocalSuggestions({ title, content, category, tags })

  if (!env.openaiApiKey) {
    return res.json({
      provider: 'local',
      suggestions: fallback,
      notice: 'Local suggestions generated. Add OPENAI_API_KEY to use the hosted model.',
    })
  }

  try {
    const suggestions = await requestOpenAI({ title, content, category, tags })

    return res.json({
      provider: 'openai',
      suggestions,
      notice: 'Suggestions generated from your draft.',
    })
  } catch (error) {
    console.error(`AI suggestion fallback: ${error.message}`)

    return res.json({
      provider: 'local',
      suggestions: fallback,
      notice: 'The AI service was unavailable, so local suggestions were generated instead.',
    })
  }
}

module.exports = { suggestContent }

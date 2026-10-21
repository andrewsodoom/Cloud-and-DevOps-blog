const { getExternalArticle, getExternalArticles } = require('../utils/externalFeeds')

async function listExternalArticles(req, res) {
  const payload = await getExternalArticles({
    limit: req.query.limit,
    source: req.query.source,
  })

  return res.json(payload)
}

async function getExternalArticleDetail(req, res) {
  const article = await getExternalArticle(req.params.id)

  if (!article) {
    return res.status(404).json({ message: 'That industry article could not be found.' })
  }

  return res.json({ article })
}

module.exports = { listExternalArticles, getExternalArticleDetail }

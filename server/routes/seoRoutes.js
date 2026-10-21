const express = require('express')
const env = require('../config/env')
const Post = require('../models/Post')
const {
  buildRobots,
  buildRssFeed,
  buildSitemap,
} = require('../utils/seo')

const router = express.Router()

async function publishedPosts() {
  return Post.find({ status: 'published' })
    .populate('author', 'name')
    .sort({ publishedAt: -1, createdAt: -1 })
    .lean()
}

router.get('/robots.txt', (req, res) => {
  res
    .type('text/plain')
    .set('Cache-Control', 'public, max-age=3600')
    .send(buildRobots(env.siteUrl))
})

router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const posts = await publishedPosts()

    res
      .type('application/xml')
      .set('Cache-Control', 'public, max-age=3600')
      .send(buildSitemap(env.siteUrl, posts))
  } catch (error) {
    next(error)
  }
})

async function sendFeed(req, res, next) {
  try {
    const posts = await publishedPosts()

    res
      .type('application/rss+xml')
      .set('Cache-Control', 'public, max-age=1800')
      .send(buildRssFeed(env.siteUrl, posts))
  } catch (error) {
    next(error)
  }
}

router.get('/feed.xml', sendFeed)
router.get('/rss.xml', sendFeed)

module.exports = router

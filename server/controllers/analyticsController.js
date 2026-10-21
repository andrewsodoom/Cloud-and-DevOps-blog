const Post = require('../models/Post')
const User = require('../models/User')
const Comment = require('../models/Comment')
const Subscriber = require('../models/Subscriber')

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

async function getOverview(req, res) {
  const [
    totalUsers,
    totalPosts,
    publishedPosts,
    draftPosts,
    totalComments,
    totalSubscribers,
    totals,
    topPosts,
    topTags,
    recentPosts,
  ] = await Promise.all([
    User.countDocuments(),
    Post.countDocuments(),
    Post.countDocuments({ status: 'published' }),
    Post.countDocuments({ status: 'draft' }),
    Comment.countDocuments(),
    Subscriber.countDocuments(),
    Post.aggregate([
      {
        $group: {
          _id: null,
          views: { $sum: { $ifNull: ['$views', 0] } },
          likes: { $sum: { $size: { $ifNull: ['$likes', []] } } },
        },
      },
      { $project: { _id: 0, views: 1, likes: 1 } },
    ]),
    Post.find({ status: 'published' })
      .populate('author', 'name')
      .sort({ publishedAt: -1 })
      .limit(100)
      .lean(),
    Post.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 8 },
    ]),
    Post.find()
      .populate('author', 'name')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean(),
  ])

  const viewCount = number(totals[0]?.views)
  const likeCount = number(totals[0]?.likes)
  const rankedPosts = topPosts
    .map((post) => ({
      ...post,
      engagement:
        number(post.views) +
        (post.likes || []).length * 4 +
        number(post.commentCount) * 6,
    }))
    .sort((left, right) => right.engagement - left.engagement)
    .slice(0, 5)
    .map((post) => ({
      id: String(post._id),
      title: post.title,
      slug: post.slug,
      category: post.category,
      status: post.status,
      author: post.author?.name || 'CloudCraft',
      views: number(post.views),
      likes: (post.likes || []).length,
      comments: number(post.commentCount),
      publishedAt: post.publishedAt,
    }))

  const engagementRate =
    viewCount > 0 ? Math.round(((likeCount + totalComments) / viewCount) * 1000) / 10 : 0

  return res.json({
    metrics: {
      totalUsers,
      totalPosts,
      publishedPosts,
      draftPosts,
      totalComments,
      totalSubscribers,
      totalViews: viewCount,
      totalLikes: likeCount,
      engagementRate,
    },
    topPosts: rankedPosts,
    topTags: topTags.map((tag) => ({ tag: tag._id, count: tag.count })),
    recentPosts: recentPosts.map((post) => ({
      id: String(post._id),
      title: post.title,
      status: post.status,
      author: post.author?.name || 'CloudCraft',
      updatedAt: post.updatedAt,
    })),
  })
}

module.exports = { getOverview }
